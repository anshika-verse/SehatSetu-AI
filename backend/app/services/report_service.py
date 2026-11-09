"""Report Service: Medical Report extraction, OCR, parameter parsing, and clinical safety summary.

Critical Clinical Safety & Integrity Rules:
- Never fabricate test results, patient names, or medical values.
- Evaluates values strictly against the laboratory's stated reference ranges.
- Highlights out-of-range parameters for discussion with a qualified clinician.
- Calculates exact mathematical difference from laboratory thresholds.
- Strictly NON-DIAGNOSTIC and NON-PRESCRIPTIVE.
"""

import io
import logging
import os
import re
import subprocess
import tempfile
from typing import Any, Dict, List, Optional, Tuple
from PIL import Image, ImageEnhance, ImageFilter
import pypdf

logger = logging.getLogger(__name__)

REPORT_DISCLAIMER = (
    "DISCLAIMER: This automated report analysis is for educational, navigational, and preparation purposes only. "
    "It organizes laboratory parameters and does NOT constitute a clinical diagnosis, prognosis, or prescription. "
    "Laboratory reference ranges vary significantly across laboratories, equipment, and patient profiles. "
    "Always consult a licensed physician or qualified medical practitioner for diagnosis and treatment decisions."
)

# Critical emergency thresholds (CAP / Medical alert limits for immediate clinical evaluation)
CRITICAL_THRESHOLDS: Dict[str, Dict[str, float]] = {
    "fasting_blood_glucose": {"critical_low": 50.0, "critical_high": 350.0},
    "postprandial_glucose": {"critical_low": 50.0, "critical_high": 400.0},
    "random_blood_glucose": {"critical_low": 50.0, "critical_high": 400.0},
    "hemoglobin": {"critical_low": 7.0, "critical_high": 20.0},
    "platelets": {"critical_low": 0.2, "critical_high": 10.0},  # in lakh/mcL (20,000 /mcL to 1,000,000 /mcL)
    "serum_potassium": {"critical_low": 2.8, "critical_high": 6.2},
    "serum_sodium": {"critical_low": 120.0, "critical_high": 160.0},
    "blood_pressure_systolic": {"critical_low": 80.0, "critical_high": 180.0},
    "blood_pressure_diastolic": {"critical_low": 50.0, "critical_high": 120.0},
    "spo2": {"critical_low": 90.0, "critical_high": 100.0},
    "serum_creatinine": {"critical_low": 0.1, "critical_high": 5.0},
}

# Catalog of standardized clinical laboratory parameters
KNOWN_LAB_PARAMETERS: List[Dict[str, Any]] = [
    {
        "id": "hemoglobin",
        "aliases": ["hemoglobin", "haemoglobin", "hb", "hgb"],
        "display_name": "Hemoglobin (Hb)",
        "default_unit": "g/dL",
        "default_low": 12.0,
        "default_high": 17.5,
        "phys_min": 2.0,
        "phys_max": 25.0,
        "category": "Complete Blood Count",
        "description_en": "Protein in red blood cells that carries oxygen from your lungs to the rest of the body.",
        "description_hi": "लाल रक्त कोशिकाओं में पाया जाने वाला प्रोटीन जो फेफड़ों से पूरे शरीर में ऑक्सीजन पहुंचाता है।",
        "description_hinglish": "Red blood cells ka protein jo body ke saare parts tak oxygen carry karta hai.",
        "doctor_question": "Ask if dietary iron deficiency, blood loss, or repeat CBC testing is advised.",
    },
    {
        "id": "fasting_blood_glucose",
        "aliases": ["fasting blood sugar", "fasting blood glucose", "fbs", "glucose fasting", "blood sugar fasting", "fasting sugar"],
        "display_name": "Fasting Blood Glucose",
        "default_unit": "mg/dL",
        "default_low": 70.0,
        "default_high": 99.0,
        "phys_min": 20.0,
        "phys_max": 900.0,
        "category": "Diabetes & Metabolism",
        "description_en": "Blood sugar concentration measured after an overnight fast (typically 8–12 hours).",
        "description_hi": "रात भर (8 से 12 घंटे) खाली पेट रहने के बाद रक्त में ग्लूकोज (शुगर) का स्तर।",
        "description_hinglish": "Raat bhar (8-12 hours) fast rakhne ke baad blood me sugar ka level.",
        "doctor_question": "Discuss whether repeat fasting glucose, an oral glucose tolerance test, or HbA1c is needed.",
    },
    {
        "id": "postprandial_glucose",
        "aliases": ["ppbs", "post prandial", "glucose post prandial", "postprandial glucose", "blood sugar pp", "pp blood sugar"],
        "display_name": "Post-Prandial Glucose (PPBS)",
        "default_unit": "mg/dL",
        "default_low": 70.0,
        "default_high": 140.0,
        "phys_min": 20.0,
        "phys_max": 900.0,
        "category": "Diabetes & Metabolism",
        "description_en": "Blood glucose level measured approximately 2 hours after the start of a meal.",
        "description_hi": "खाना शुरू करने के लगभग 2 घंटे बाद रक्त में ग्लूकोज का स्तर।",
        "description_hinglish": "Khana shuru karne ke lagbhag 2 hours baad blood glucose ka level.",
        "doctor_question": "Inquire whether post-meal glucose spikes warrant dietary adjustments or further evaluation.",
    },
    {
        "id": "random_blood_glucose",
        "aliases": ["random blood sugar", "random blood glucose", "rbs", "glucose random", "blood sugar random"],
        "display_name": "Random Blood Glucose (RBS)",
        "default_unit": "mg/dL",
        "default_low": 70.0,
        "default_high": 140.0,
        "phys_min": 20.0,
        "phys_max": 900.0,
        "category": "Diabetes & Metabolism",
        "description_en": "Blood glucose concentration taken at any time regardless of when meals were consumed.",
        "description_hi": "बिना उपवास के किसी भी समय मापा गया रक्त शर्करा स्तर।",
        "description_hinglish": "Kisi bhi time bina fast ke check kiya gaya blood sugar level.",
        "doctor_question": "Ask whether fasting or HbA1c testing is warranted to confirm metabolic patterns.",
    },
    {
        "id": "hba1c",
        "aliases": ["hba1c", "glycated hemoglobin", "glycohemoglobin", "a1c"],
        "display_name": "HbA1c (Glycated Hemoglobin)",
        "default_unit": "%",
        "default_low": 4.0,
        "default_high": 5.6,
        "phys_min": 3.0,
        "phys_max": 20.0,
        "category": "Diabetes & Metabolism",
        "description_en": "Average blood sugar levels over the past 2 to 3 months reflected by glycated hemoglobin.",
        "description_hi": "पिछले 2 से 3 महीनों का औसत ब्लड शुगर स्तर।",
        "description_hinglish": "Pichhle 2-3 months ka average blood sugar trend.",
        "doctor_question": "Discuss lifestyle measures, glycemic control goals, or repeat testing schedule.",
    },
    {
        "id": "wbc_count",
        "aliases": ["total leukocyte count", "total leucocyte count", "tlc", "wbc", "wbc count", "white blood cells", "total wbc"],
        "display_name": "Total Leukocyte Count (WBC)",
        "default_unit": "cells/mcL",
        "default_low": 4000.0,
        "default_high": 11000.0,
        "phys_min": 500.0,
        "phys_max": 100000.0,
        "category": "Complete Blood Count",
        "description_en": "Immune defense cells that help fight bacterial, viral, and inflammatory infections.",
        "description_hi": "श्वेत रक्त कोशिकाएं जो शरीर को संक्रमण और बैक्टीरिया से लड़ने में मदद करती हैं।",
        "description_hinglish": "White blood cells jo infection aur bimariyon se ladne ka kaam karte hain.",
        "doctor_question": "Inquire whether recent infections, fever, allergies, or medication effects could be involved.",
    },
    {
        "id": "rbc_count",
        "aliases": ["total rbc", "rbc count", "red blood cell count", "rbc", "erythrocytes"],
        "display_name": "Red Blood Cell Count (RBC)",
        "default_unit": "mil/mcL",
        "default_low": 4.0,
        "default_high": 5.8,
        "phys_min": 1.0,
        "phys_max": 10.0,
        "category": "Complete Blood Count",
        "description_en": "Number of oxygen-transporting red cells circulating in the blood.",
        "description_hi": "रक्त में ऑक्सीजन ले जाने वाली लाल रक्त कोशिकाओं की कुल संख्या।",
        "description_hinglish": "Blood me oxygen carry karne wali red cells ki total quantity.",
        "doctor_question": "Discuss correlation with hemoglobin, hydration status, and red cell indices.",
    },
    {
        "id": "platelets",
        "aliases": ["platelet count", "platelets", "plt", "thrombocytes"],
        "display_name": "Platelet Count",
        "default_unit": "lakh/mcL",
        "default_low": 1.5,
        "default_high": 4.5,
        "phys_min": 0.05,
        "phys_max": 20.0,
        "category": "Complete Blood Count",
        "description_en": "Small blood cell fragments essential for forming blood clots and stopping bleeding.",
        "description_hi": "रक्त कोशिकाएं जो चोट लगने पर थक्का बनाने और रक्तस्राव रोकने में मदद करती हैं।",
        "description_hinglish": "Blood cells jo bleeding rokne aur blood clotting me zaroori hain.",
        "doctor_question": "Inquire if viral infections, dengue, medication side-effects, or bruising need review.",
    },
    {
        "id": "serum_creatinine",
        "aliases": ["creatinine", "serum creatinine", "s creatinine", "creatinine serum"],
        "display_name": "Serum Creatinine",
        "default_unit": "mg/dL",
        "default_low": 0.6,
        "default_high": 1.2,
        "phys_min": 0.1,
        "phys_max": 20.0,
        "category": "Kidney Function (KFT)",
        "description_en": "Normal muscle breakdown byproduct filtered out by healthy kidneys.",
        "description_hi": "किडनी द्वारा छाना जाने वाला अपशिष्ट उत्पाद जो किडनी के कार्य को दर्शाता है।",
        "description_hinglish": "Kidney dwara filter hone wala waste product jo kidney health ko darshata hai.",
        "doctor_question": "Ask about eGFR, hydration status, blood pressure management, and kidney function follow-up.",
    },
    {
        "id": "blood_urea",
        "aliases": ["blood urea", "urea", "bun", "blood urea nitrogen", "s urea"],
        "display_name": "Blood Urea Nitrogen (BUN)",
        "default_unit": "mg/dL",
        "default_low": 15.0,
        "default_high": 40.0,
        "phys_min": 2.0,
        "phys_max": 250.0,
        "category": "Kidney Function (KFT)",
        "description_en": "Nitrogen waste product formed in the liver and excreted through kidney filtration.",
        "description_hi": "लिवर में बनने वाला नाइट्रोजन अपशिष्ट जो किडनी द्वारा बाहर निकाला जाता है।",
        "description_hinglish": "Liver me banne wala waste jo kidneys filter karke bahar nikalti hain.",
        "doctor_question": "Discuss dietary protein intake, hydration levels, and renal filtration markers.",
    },
    {
        "id": "total_cholesterol",
        "aliases": ["total cholesterol", "cholesterol total", "serum cholesterol"],
        "display_name": "Total Cholesterol",
        "default_unit": "mg/dL",
        "default_low": 125.0,
        "default_high": 200.0,
        "phys_min": 50.0,
        "phys_max": 600.0,
        "category": "Lipid Profile",
        "description_en": "Combined measurement of various fats and cholesterol carriers circulating in blood.",
        "description_hi": "रक्त में घूमने वाले कोलेस्ट्रॉल वसा की कुल मात्रा।",
        "description_hinglish": "Blood me total circulating cholesterol fat ki quantity.",
        "doctor_question": "Ask about cardiovascular risk assessment, dietary adjustments, and lipid profile fractions.",
    },
    {
        "id": "hdl_cholesterol",
        "aliases": ["hdl", "hdl cholesterol", "good cholesterol", "high density lipoprotein"],
        "display_name": "HDL Cholesterol (Good)",
        "default_unit": "mg/dL",
        "default_low": 40.0,
        "default_high": 60.0,
        "phys_min": 10.0,
        "phys_max": 150.0,
        "category": "Lipid Profile",
        "description_en": "High-density lipoprotein that helps carry cholesterol away from arterial walls back to liver.",
        "description_hi": "अच्छा कोलेस्ट्रॉल जो रक्त वाहिकाओं से अतिरिक्त वसा हटाने में मदद करता है।",
        "description_hinglish": "Good cholesterol jo blood vessels ko healthy rakhne me help karta hai.",
        "doctor_question": "Discuss regular exercise and healthy dietary fats to support protective HDL levels.",
    },
    {
        "id": "ldl_cholesterol",
        "aliases": ["ldl", "ldl cholesterol", "bad cholesterol", "low density lipoprotein"],
        "display_name": "LDL Cholesterol (Bad)",
        "default_unit": "mg/dL",
        "default_low": 50.0,
        "default_high": 100.0,
        "phys_min": 20.0,
        "phys_max": 500.0,
        "category": "Lipid Profile",
        "description_en": "Low-density lipoprotein; excess amounts can gradually build up in arterial blood vessels.",
        "description_hi": "कम घनत्व वाला कोलेस्ट्रॉल; अधिक मात्रा में होने पर धमनियों में रुकावट आ सकती है।",
        "description_hinglish": "Bad cholesterol jo excess hone par arteries me jama ho sakta hai.",
        "doctor_question": "Discuss dietary changes, lifestyle goals, and heart health monitoring.",
    },
    {
        "id": "triglycerides",
        "aliases": ["triglycerides", "serum triglycerides", "tg", "triglyceride"],
        "display_name": "Triglycerides",
        "default_unit": "mg/dL",
        "default_low": 50.0,
        "default_high": 150.0,
        "phys_min": 20.0,
        "phys_max": 1500.0,
        "category": "Lipid Profile",
        "description_en": "The most common form of stored fat in the body, closely linked to diet and carbohydrates.",
        "description_hi": "शरीर में पाई जाने वाली आम वसा जो भोजन से कैलोरी ग्रहण करने से बनती है।",
        "description_hinglish": "Body me calorie aur carbohydrate intake se banne wala fat.",
        "doctor_question": "Ask about carbohydrate management, physical activity, and fasting status before blood draw.",
    },
    {
        "id": "vldl_cholesterol",
        "aliases": ["vldl", "vldl cholesterol"],
        "display_name": "VLDL Cholesterol",
        "default_unit": "mg/dL",
        "default_low": 5.0,
        "default_high": 30.0,
        "phys_min": 2.0,
        "phys_max": 200.0,
        "category": "Lipid Profile",
        "description_en": "Very low-density lipoprotein that transports triglycerides produced by the liver.",
        "description_hi": "बहुत कम घनत्व वाला लिपोप्रोटीन जो लिवर द्वारा ट्राइग्लिसराइड्स ले जाता है।",
        "description_hinglish": "Very low-density lipoprotein jo triglycerides ko transport karta hai.",
        "doctor_question": "Discuss relation to overall triglycerides and metabolic profile.",
    },
    {
        "id": "sgpt_alt",
        "aliases": ["sgpt", "alt", "alanine aminotransferase", "alanine transaminase"],
        "display_name": "SGPT / ALT",
        "default_unit": "U/L",
        "default_low": 7.0,
        "default_high": 55.0,
        "phys_min": 2.0,
        "phys_max": 2000.0,
        "category": "Liver Function (LFT)",
        "description_en": "Enzyme located primarily in liver cells; rises when liver cells experience irritation or strain.",
        "description_hi": "लिवर एंजाइम जो लिवर कोशिकाओं के स्वास्थ्य और कार्यप्रणाली का संकेत देता है।",
        "description_hinglish": "Liver enzyme jo liver cells ke health ko darshata hai.",
        "doctor_question": "Ask about medication effects, fatty liver screening, or lifestyle changes.",
    },
    {
        "id": "sgot_ast",
        "aliases": ["sgot", "ast", "aspartate aminotransferase", "aspartate transaminase"],
        "display_name": "SGOT / AST",
        "default_unit": "U/L",
        "default_low": 8.0,
        "default_high": 48.0,
        "phys_min": 2.0,
        "phys_max": 2000.0,
        "category": "Liver Function (LFT)",
        "description_en": "Enzyme found in liver, heart, and muscle tissue that helps evaluate liver and cellular health.",
        "description_hi": "एंजाइम जो लिवर, हृदय और मांसपेशियों के स्वास्थ्य का मूल्यांकन करने में मदद करता है।",
        "description_hinglish": "Liver, heart aur muscle cells me paya jane wala enzyme.",
        "doctor_question": "Discuss SGOT/SGPT ratio and rule out strenuous physical exertion or medications.",
    },
    {
        "id": "total_bilirubin",
        "aliases": ["total bilirubin", "serum bilirubin", "bilirubin total", "s bilirubin"],
        "display_name": "Total Bilirubin",
        "default_unit": "mg/dL",
        "default_low": 0.2,
        "default_high": 1.2,
        "phys_min": 0.05,
        "phys_max": 35.0,
        "category": "Liver Function (LFT)",
        "description_en": "Yellow byproduct formed during the normal breakdown of red blood cells, processed by liver.",
        "description_hi": "लाल रक्त कोशिकाओं के टूटने से बनने वाला पीला पदार्थ जिसे लिवर प्रोसेस करता है।",
        "description_hinglish": "Red cells ke breakdown se banne wala yellow pigment jo liver filter karta hai.",
        "doctor_question": "Inquire if follow-up liver evaluation, ultrasound, or direct/indirect fractions are needed.",
    },
    {
        "id": "serum_potassium",
        "aliases": ["serum potassium", "potassium", "k+", "s potassium"],
        "display_name": "Serum Potassium",
        "default_unit": "mEq/L",
        "default_low": 3.5,
        "default_high": 5.1,
        "phys_min": 1.5,
        "phys_max": 10.0,
        "category": "Electrolytes",
        "description_en": "Essential electrolyte critical for normal heart rhythm, nerve function, and muscle contraction.",
        "description_hi": "आवश्यक इलेक्ट्रोलाइट जो हृदय की धड़कन, तंत्रिका और मांसपेशियों के कार्य के लिए जरूरी है।",
        "description_hinglish": "Zaroori electrolyte jo heart rhythm aur muscle health ke liye critical hai.",
        "doctor_question": "Important: Discuss promptly with your doctor, as potassium directly impacts heart rhythm.",
    },
    {
        "id": "serum_sodium",
        "aliases": ["serum sodium", "sodium", "na+", "s sodium"],
        "display_name": "Serum Sodium",
        "default_unit": "mEq/L",
        "default_low": 135.0,
        "default_high": 145.0,
        "phys_min": 100.0,
        "phys_max": 180.0,
        "category": "Electrolytes",
        "description_en": "Primary electrolyte regulating body fluid balance, blood pressure, and cellular function.",
        "description_hi": "प्रमुख इलेक्ट्रोलाइट जो शरीर में पानी के संतुलन और रक्तचाप को नियंत्रित करता है।",
        "description_hinglish": "Main electrolyte jo body fluid balance aur blood pressure ko maintain karta hai.",
        "doctor_question": "Discuss fluid intake, blood pressure medications, or dietary sodium balance.",
    },
    {
        "id": "serum_calcium",
        "aliases": ["serum calcium", "calcium", "total calcium", "s calcium"],
        "display_name": "Serum Calcium",
        "default_unit": "mg/dL",
        "default_low": 8.5,
        "default_high": 10.5,
        "phys_min": 4.0,
        "phys_max": 18.0,
        "category": "Bone & Mineral Metabolism",
        "description_en": "Vital mineral for bone structure, muscle movement, and nerve signal transmission.",
        "description_hi": "हड्डियों की मजबूती, मांसपेशियों और तंत्रिका तंत्र के लिए आवश्यक खनिज।",
        "description_hinglish": "Haddiyon ki mazbooti aur nerve signals ke liye zaroori mineral.",
        "doctor_question": "Ask about Vitamin D status, parathyroid health, and dietary calcium balance.",
    },
    {
        "id": "tsh",
        "aliases": ["tsh", "thyroid stimulating hormone", "ultrasensitive tsh"],
        "display_name": "Thyroid Stimulating Hormone (TSH)",
        "default_unit": "uIU/mL",
        "default_low": 0.4,
        "default_high": 4.5,
        "phys_min": 0.01,
        "phys_max": 150.0,
        "category": "Thyroid Profile",
        "description_en": "Pituitary gland hormone that instructs the thyroid gland to release thyroid hormones.",
        "description_hi": "पिट्यूटरी ग्रंथि द्वारा छोड़ा जाने वाला हार्मोन जो थायरॉयड को नियंत्रित करता है।",
        "description_hinglish": "Pituitary gland ka hormone jo thyroid hormones ko control karta hai.",
        "doctor_question": "Inquire whether Free T3, Free T4, or thyroid antibody testing is recommended.",
    },
    {
        "id": "vitamin_d",
        "aliases": ["vitamin d", "25-hydroxy vitamin d", "25-oh vitamin d", "vit d3", "vit d"],
        "display_name": "Vitamin D (25-OH)",
        "default_unit": "ng/mL",
        "default_low": 30.0,
        "default_high": 100.0,
        "phys_min": 2.0,
        "phys_max": 200.0,
        "category": "Vitamins & Nutrition",
        "description_en": "Hormone-like vitamin essential for calcium absorption, bone strength, and immune health.",
        "description_hi": "हड्डियों की मजबूती और रोग प्रतिरोधक क्षमता के लिए आवश्यक विटामिन।",
        "description_hinglish": "Bones ki strength aur calcium absorption ke liye zaroori vitamin.",
        "doctor_question": "Ask about safe sun exposure, dietary sources, or doctor-recommended supplementation.",
    },
    {
        "id": "vitamin_b12",
        "aliases": ["vitamin b12", "b12", "cyanocobalamin", "vit b12"],
        "display_name": "Vitamin B12",
        "default_unit": "pg/mL",
        "default_low": 200.0,
        "default_high": 900.0,
        "phys_min": 20.0,
        "phys_max": 2500.0,
        "category": "Vitamins & Nutrition",
        "description_en": "Essential B vitamin required for red blood cell synthesis, nerve health, and DNA production.",
        "description_hi": "लाल रक्त कोशिकाओं और नसों के स्वास्थ्य के लिए आवश्यक विटामिन।",
        "description_hinglish": "Red cells banane aur nerves ko healthy rakhne wala zaroori vitamin.",
        "doctor_question": "Discuss dietary intake, vegetarian nutrition planning, or supplementation if low.",
    },
    {
        "id": "esr",
        "aliases": ["esr", "erythrocyte sedimentation rate", "sed rate"],
        "display_name": "Erythrocyte Sedimentation Rate (ESR)",
        "default_unit": "mm/hr",
        "default_low": 0.0,
        "default_high": 20.0,
        "phys_min": 0.0,
        "phys_max": 150.0,
        "category": "Inflammatory Markers",
        "description_en": "Non-specific marker reflecting the degree of systemic inflammation in the body.",
        "description_hi": "शरीर में सूजन (इन्फ्लेमेशन) या इन्फेक्शन का गैर-विशिष्ट संकेतक।",
        "description_hinglish": "Body me inflammation ya infection ka non-specific test.",
        "doctor_question": "Inquire whether joint aches, fever, or inflammatory conditions warrant specific follow-up.",
    },
    {
        "id": "blood_pressure_systolic",
        "aliases": ["blood pressure systolic", "systolic bp", "systolic blood pressure", "systolic"],
        "display_name": "Blood Pressure (Systolic)",
        "default_unit": "mmHg",
        "default_low": 90.0,
        "default_high": 120.0,
        "phys_min": 50.0,
        "phys_max": 280.0,
        "category": "Vital Signs",
        "description_en": "Pressure in arteries when the heart contracts and pumps blood forward.",
        "description_hi": "हृदय के संकुचन के समय धमनियों में रक्त का दबाव।",
        "description_hinglish": "Heart contract hone par blood vessels me pressure.",
        "doctor_question": "Discuss home BP monitoring, sodium restriction, and repeat resting measurements.",
    },
    {
        "id": "blood_pressure_diastolic",
        "aliases": ["blood pressure diastolic", "diastolic bp", "diastolic blood pressure", "diastolic"],
        "display_name": "Blood Pressure (Diastolic)",
        "default_unit": "mmHg",
        "default_low": 60.0,
        "default_high": 80.0,
        "phys_min": 30.0,
        "phys_max": 160.0,
        "category": "Vital Signs",
        "description_en": "Pressure in arteries when the heart rests between beats.",
        "description_hi": "दो धड़कनों के बीच हृदय के आराम की स्थिति में धमनियों का दबाव।",
        "description_hinglish": "Heartbeats ke beech rest period me arteries me pressure.",
        "doctor_question": "Discuss diastolic trends and cardiovascular wellness.",
    },
    {
        "id": "heart_rate",
        "aliases": ["heart rate", "pulse", "pulse rate", "resting heart rate"],
        "display_name": "Heart Rate / Pulse",
        "default_unit": "bpm",
        "default_low": 60.0,
        "default_high": 100.0,
        "phys_min": 30.0,
        "phys_max": 240.0,
        "category": "Vital Signs",
        "description_en": "Frequency of resting heart beats per minute.",
        "description_hi": "प्रति मिनट हृदय की धड़कनों की संख्या।",
        "description_hinglish": "Ek minute me heart kitni baar beat karta hai.",
        "doctor_question": "Ask if resting pulse correlates with stress, caffeine, fever, or physical fitness.",
    },
    {
        "id": "spo2",
        "aliases": ["spo2", "pulse oximetry", "oxygen saturation", "o2 saturation", "blood oxygen"],
        "display_name": "SpO2 (Pulse Oximetry)",
        "default_unit": "%",
        "default_low": 95.0,
        "default_high": 100.0,
        "phys_min": 50.0,
        "phys_max": 100.0,
        "category": "Vital Signs",
        "description_en": "Percentage of oxygen-carrying hemoglobin in arterial blood.",
        "description_hi": "रक्त में ऑक्सीजन ले जाने वाली हीमोग्लोबिन का प्रतिशत।",
        "description_hinglish": "Blood me oxygen saturation ka percentage.",
        "doctor_question": "If below 95%, report promptly to a clinician, especially if experiencing shortness of breath.",
    },
    {
        "id": "temperature",
        "aliases": ["body temperature", "temperature", "temp", "oral temperature"],
        "display_name": "Body Temperature",
        "default_unit": "°F",
        "default_low": 97.8,
        "default_high": 99.1,
        "phys_min": 90.0,
        "phys_max": 110.0,
        "category": "Vital Signs",
        "description_en": "Measure of the body's internal thermal balance.",
        "description_hi": "शरीर का सामान्य तापमान।",
        "description_hinglish": "Body ka internal thermal temperature.",
        "doctor_question": "Ask about fever duration, associated chills, or infectious exposure.",
    },
]

# Date patterns commonly found in lab reports
DATE_PATTERNS = [
    re.compile(r"(?:report\s*date|collection\s*date|collected|sample\s*date|dated|test\s*date|date)[\s\:\-=]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})", re.IGNORECASE),
    re.compile(r"(?:report\s*date|collection\s*date|collected|sample\s*date|dated|test\s*date)[\s\:\-=]*([0-9]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+[0-9]{2,4})", re.IGNORECASE),
    re.compile(r"\b([0-9]{4}[\-\/][0-9]{1,2}[\-\/][0-9]{1,2})\b"),
    re.compile(r"\b([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})\b"),
]


class MedicalReportService:
    """Extracts, structures, reviews, and validates laboratory parameters from medical reports."""

    def __init__(self) -> None:
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        self.win_ocr_script = os.path.join(self.script_dir, "win_ocr.ps1")

    def extract_text_from_file(self, content: bytes, filename: str, content_type: str) -> str:
        """Extract text from uploaded PDF or image documents (with native Windows OCR fallback)."""
        lower_name = filename.lower()
        is_pdf = lower_name.endswith(".pdf") or "pdf" in content_type.lower()
        is_image = any(lower_name.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tif", ".tiff"]) or "image" in content_type.lower()

        # 1. PDF Document Handling
        if is_pdf:
            extracted_pdf_text = self._extract_text_from_pdf(content)
            if len(extracted_pdf_text.strip()) >= 50:
                logger.info("Extracted %d characters directly from PDF text layer: %s", len(extracted_pdf_text), filename)
                return extracted_pdf_text

            # If PDF text layer is empty or sparse (< 50 chars), it is likely a scanned PDF
            logger.info("PDF has minimal text (%d chars). Attempting scanned page OCR: %s", len(extracted_pdf_text), filename)
            scanned_ocr = self._ocr_pdf_images(content)
            if scanned_ocr and len(scanned_ocr.strip()) > len(extracted_pdf_text.strip()):
                return scanned_ocr
            return extracted_pdf_text

        # 2. Image Document Handling (JPG, PNG, etc.)
        if is_image:
            ocr_text = self._ocr_image_bytes(content)
            if ocr_text:
                logger.info("OCR extracted %d characters from image %s", len(ocr_text), filename)
                return ocr_text

        # 3. Text or raw fallback
        try:
            return content.decode("utf-8", errors="ignore").strip()
        except Exception:
            return ""

    def _extract_text_from_pdf(self, content: bytes) -> str:
        """Extract text stream from PDF pages using pypdf."""
        try:
            reader = pypdf.PdfReader(io.BytesIO(content))
            pages_text = []
            for p in reader.pages:
                t = p.extract_text()
                if t:
                    pages_text.append(t)
            return "\n".join(pages_text).strip()
        except Exception as exc:
            logger.warning("pypdf direct extraction failed: %s", exc)
            return ""

    def _ocr_pdf_images(self, content: bytes) -> str:
        """Extract embedded images from scanned PDF pages and run OCR on them."""
        try:
            reader = pypdf.PdfReader(io.BytesIO(content))
            ocr_pages = []
            for page_idx, page in enumerate(reader.pages[:5]):  # limit to first 5 pages for responsiveness
                for img_idx, img_obj in enumerate(page.images):
                    try:
                        img_bytes = img_obj.data
                        page_ocr = self._ocr_image_bytes(img_bytes)
                        if page_ocr:
                            ocr_pages.append(page_ocr)
                    except Exception as img_err:
                        logger.warning("Failed OCR for PDF page %d image %d: %s", page_idx, img_idx, img_err)
            return "\n\n".join(ocr_pages).strip()
        except Exception as exc:
            logger.warning("Scanned PDF OCR failed: %s", exc)
            return ""

    def _ocr_image_bytes(self, content: bytes) -> str:
        """Run OCR on image bytes using preprocessed Pillow image and Windows native OCR engine."""
        try:
            pil_image = Image.open(io.BytesIO(content))
            if pil_image.mode != "RGB":
                pil_image = pil_image.convert("RGB")

            # Image enhancement for OCR accuracy
            # Resize if too small (minimum 1000px width for clear OCR of small font numbers)
            w, h = pil_image.size
            if w < 1000:
                scale = 1000.0 / w
                pil_image = pil_image.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

            # Contrast enhancement
            enhancer = ImageEnhance.Contrast(pil_image)
            enhanced = enhancer.enhance(1.4)

            # Save to temporary PNG file for Windows OCR script
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_file:
                tmp_path = tmp_file.name

            try:
                enhanced.save(tmp_path, format="PNG")
                if os.path.exists(self.win_ocr_script):
                    cmd = ["powershell", "-ExecutionPolicy", "Bypass", "-File", self.win_ocr_script, tmp_path]
                    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=20)
                    if proc.returncode == 0 and proc.stdout:
                        return proc.stdout.strip()
                    logger.warning("Windows OCR PowerShell script returned code %d: %s", proc.returncode, proc.stderr)
            finally:
                if os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass
        except Exception as exc:
            logger.warning("Image OCR failed: %s", exc)

        return ""

    def extract_report_date(self, text: str) -> Optional[str]:
        """Attempt to extract report or collection date from text."""
        for pattern in DATE_PATTERNS:
            match = pattern.search(text)
            if match:
                raw_date = match.group(1).strip()
                # Clean separators
                cleaned = re.sub(r"[\s\:\-]+$", "", raw_date).strip()
                if len(cleaned) >= 6:
                    return cleaned
        return None

    def parse_report_parameters(self, text: str, user_language: str = "hinglish") -> Dict[str, Any]:
        """Parse structured lab test parameters, units, values, reference ranges, and confidence."""
        results: List[Dict[str, Any]] = []
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # Extract document date
        report_date = self.extract_report_date(text)

        # 1. First, check for combined Blood Pressure line (e.g. "BP: 130/85 mmHg")
        combined_bp = self._find_combined_blood_pressure(lines)
        found_param_ids = set()
        if combined_bp:
            systolic, diastolic = combined_bp
            results.extend([systolic, diastolic])
            found_param_ids.add("blood_pressure_systolic")
            found_param_ids.add("blood_pressure_diastolic")

        # 2. Search for each known lab parameter in extracted text
        for param in KNOWN_LAB_PARAMETERS:
            if param["id"] in found_param_ids:
                continue

            match = self._find_parameter_in_text(text, lines, param)
            if match:
                results.append(match)
                found_param_ids.add(param["id"])

        # 3. Critical clinical checks
        has_critical = any(p.get("is_critical") for p in results)
        critical_count = sum(1 for p in results if p.get("is_critical"))

        # 4. Build comprehensive patient summary
        summary_text = self._build_intelligent_patient_summary(
            results,
            user_language=user_language,
            report_date=report_date,
            has_critical=has_critical,
        )

        return {
            "parameters": results,
            "total_found": len(results),
            "out_of_range_count": sum(1 for p in results if p["is_out_of_range"]),
            "critical_count": critical_count,
            "has_critical": has_critical,
            "report_date": report_date,
            "summary": summary_text,
            "disclaimer": REPORT_DISCLAIMER,
        }

    def _find_combined_blood_pressure(self, lines: List[str]) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        """Match combined blood pressure representations like '120/80 mmHg' or 'BP: 138/88'."""
        bp_pattern = re.compile(
            r"\b(?:blood\s*pressure|b\.?p\.?)[\s\:\-=]*([\d]{2,3})\s*[\/\\\|]\s*([\d]{2,3})\s*(?:mm\s*hg)?",
            re.IGNORECASE,
        )
        for line in lines:
            m = bp_pattern.search(line)
            if m:
                try:
                    sys_val = float(m.group(1))
                    dia_val = float(m.group(2))
                except ValueError:
                    continue

                if 60 <= sys_val <= 260 and 40 <= dia_val <= 150:
                    is_sys_out = sys_val < 90 or sys_val > 120
                    is_dia_out = dia_val < 60 or dia_val > 80

                    sys_status = "low" if sys_val < 90 else "high" if sys_val > 120 else "normal"
                    dia_status = "low" if dia_val < 60 else "high" if dia_val > 80 else "normal"

                    sys_diff = self._format_difference(sys_val, 90.0, 120.0, "mmHg")
                    dia_diff = self._format_difference(dia_val, 60.0, 80.0, "mmHg")

                    is_sys_crit = sys_val >= 180 or sys_val <= 80
                    is_dia_crit = dia_val >= 120 or dia_val <= 50

                    systolic_item = {
                        "parameter_id": "blood_pressure_systolic",
                        "name": "Blood Pressure (Systolic)",
                        "category": "Vital Signs",
                        "value": sys_val,
                        "unit": "mmHg",
                        "reference_range": "90 - 120 mmHg",
                        "reference_low": 90.0,
                        "reference_high": 120.0,
                        "status": sys_status,
                        "status_label": "Above Stated Range" if sys_status == "high" else "Below Stated Range" if sys_status == "low" else "Within Stated Range",
                        "is_out_of_range": is_sys_out,
                        "difference_from_range": sys_diff,
                        "is_critical": is_sys_crit,
                        "confidence": "high",
                        "description": "Pressure in arteries when the heart contracts and pumps blood.",
                        "doctor_question": "Discuss systolic blood pressure trend and cardiovascular wellness.",
                    }

                    diastolic_item = {
                        "parameter_id": "blood_pressure_diastolic",
                        "name": "Blood Pressure (Diastolic)",
                        "category": "Vital Signs",
                        "value": dia_val,
                        "unit": "mmHg",
                        "reference_range": "60 - 80 mmHg",
                        "reference_low": 60.0,
                        "reference_high": 80.0,
                        "status": dia_status,
                        "status_label": "Above Stated Range" if dia_status == "high" else "Below Stated Range" if dia_status == "low" else "Within Stated Range",
                        "is_out_of_range": is_dia_out,
                        "difference_from_range": dia_diff,
                        "is_critical": is_dia_crit,
                        "confidence": "high",
                        "description": "Pressure in arteries when the heart rests between beats.",
                        "doctor_question": "Discuss diastolic trends and resting measurements.",
                    }
                    return systolic_item, diastolic_item
        return None

    def _find_parameter_in_text(
        self,
        full_text: str,
        lines: List[str],
        param: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Identify parameter in text, extract numerical value, stated range, and compute confidence."""
        for alias in param["aliases"]:
            # Robust regex pattern matching:
            # Matches: Name [delimiter] [optional status word H/L] Value [optional unit] [optional status] [optional range (X - Y or < X)]
            # Examples:
            # - Hemoglobin: 11.2 g/dL (12.0 - 15.5)
            # - Fasting Blood Sugar   145.0   High   mg/dL   70.0 - 99.0
            # - Total Cholesterol: 215 mg/dL (< 200)
            pattern = re.compile(
                rf"\b{re.escape(alias)}\b(?:\s*\([a-zA-Z0-9_\-/\s]+\))?[\s\:\-=|\t]*"
                rf"(?:[hHlL]|high|low|normal|abnormal)?[\s\:\-=|\t]*"
                rf"([\d]+(?:\.[\d]+)?)\s*"
                rf"([a-zA-Z/%°µ]+(?:\/[a-zA-Z]+)?)?[\s|\t]*"
                rf"(?:[hHlL]|high|low|normal|abnormal)?[\s|\t]*"
                rf"(?:\(?\s*(?:ref|reference|normal|range|stated|desirable|optimal)?[\s\:\-=]*"
                rf"([<>]?\s*[\d]+(?:\.[\d]+)?(?:\s*[\-–to]+\s*[\d]+(?:\.[\d]+)?)?)\s*\)?)?",
                re.IGNORECASE,
            )

            for line in lines:
                m = pattern.search(line)
                if not m:
                    continue

                try:
                    raw_val = float(m.group(1))
                except ValueError:
                    continue

                # Physiological plausibility check: Discard obvious artifacts (e.g. line numbers or years like 2026)
                if raw_val < param.get("phys_min", 0.0) or raw_val > param.get("phys_max", 999999.0):
                    continue

                raw_unit = (m.group(2) or "").strip()
                unit = self._normalize_unit(raw_unit, param["default_unit"])
                ref_str = (m.group(3) or "").strip()

                # Stated laboratory range extraction
                low = param["default_low"]
                high = param["default_high"]
                has_stated_range = False
                stated_range = f"{low} - {high} {unit}"

                if ref_str:
                    low, high, parsed_range, has_stated_range = self._parse_reference_range(ref_str, unit, low, high)
                    if has_stated_range:
                        stated_range = parsed_range

                # Evaluate status against range
                is_low = raw_val < low
                is_high = raw_val > high
                is_out = is_low or is_high

                status = "normal"
                status_label = "Within Stated Range"
                if is_low:
                    status = "low"
                    status_label = "Below Stated Range"
                elif is_high:
                    status = "high"
                    status_label = "Above Stated Range"

                # Mathematical difference from stated range
                diff_text = self._format_difference(raw_val, low, high, unit)

                # Critical threshold evaluation
                is_critical = False
                crit = CRITICAL_THRESHOLDS.get(param["id"])
                if crit:
                    if raw_val <= crit.get("critical_low", -1e9) or raw_val >= crit.get("critical_high", 1e9):
                        is_critical = True

                # Confidence assessment
                confidence = "high"
                if not has_stated_range and not raw_unit:
                    confidence = "low"
                elif not has_stated_range or not raw_unit:
                    confidence = "medium"

                return {
                    "parameter_id": param["id"],
                    "name": param["display_name"],
                    "category": param["category"],
                    "value": raw_val,
                    "unit": unit,
                    "reference_range": stated_range,
                    "reference_low": low,
                    "reference_high": high,
                    "has_stated_range": has_stated_range,
                    "status": status,
                    "status_label": status_label,
                    "is_out_of_range": is_out,
                    "difference_from_range": diff_text,
                    "is_critical": is_critical,
                    "confidence": confidence,
                    "description": param["description_en"],
                    "description_hi": param.get("description_hi", param["description_en"]),
                    "description_hinglish": param.get("description_hinglish", param["description_en"]),
                    "doctor_question": param.get("doctor_question", "Discuss this parameter with your doctor."),
                }

        return None

    def _normalize_unit(self, unit_str: str, default_unit: str) -> str:
        """Normalize unit representations to standard clinical formatting."""
        if not unit_str:
            return default_unit
        u = unit_str.strip().lower()
        if u in ["g/dl", "gm/dl", "g/d", "g/100ml"]:
            return "g/dL"
        if u in ["mg/dl", "mg/d", "mg%"]:
            return "mg/dL"
        if u in ["%", "percent"]:
            return "%"
        if u in ["cells/cumm", "cells/mm3", "cumm", "mm3", "/cumm", "cells/mcl", "/mcl", "per mcL", "cells/ul"]:
            return "cells/mcL"
        if u in ["lakh/cumm", "lakhs/cumm", "lakh/mcl", "lakhs/mcl", "lacs/cumm", "lakhs"]:
            return "lakh/mcL"
        if u in ["mil/mcl", "million/cumm", "million/mcl", "m/cumm"]:
            return "mil/mcL"
        if u in ["meq/l", "mmol/l"]:
            return "mEq/L"
        if u in ["uiu/ml", "µiu/ml", "miu/l", "uiu/l"]:
            return "uIU/mL"
        if u in ["u/l", "iu/l"]:
            return "U/L"
        if u in ["mm/hr", "mm/1st hr", "mm/hour"]:
            return "mm/hr"
        if u in ["ng/ml", "ng/m"]:
            return "ng/mL"
        if u in ["pg/ml", "pg/m"]:
            return "pg/mL"
        if u in ["mmhg", "mm hg"]:
            return "mmHg"
        if u in ["bpm", "beats/min"]:
            return "bpm"
        if u in ["°f", "f", "deg f"]:
            return "°F"
        if u in ["°c", "c", "deg c"]:
            return "°C"
        return default_unit

    def _parse_reference_range(
        self,
        ref_str: str,
        unit: str,
        fallback_low: float,
        fallback_high: float,
    ) -> Tuple[float, float, str, bool]:
        """Parse lab reference ranges like '12.0 - 15.5', '< 200', '> 40', or '70 to 99'."""
        cleaned = ref_str.strip().replace("–", "-")
        # Format: < X
        if cleaned.startswith("<"):
            try:
                num = float(cleaned.replace("<", "").strip())
                return 0.0, num, f"< {num} {unit}", True
            except ValueError:
                pass
        # Format: > X
        if cleaned.startswith(">"):
            try:
                num = float(cleaned.replace(">", "").strip())
                return num, 99999.0, f"> {num} {unit}", True
            except ValueError:
                pass

        # Format: A - B or A to B
        parts = re.split(r"[\-]|(?:\sto\s)", cleaned)
        if len(parts) == 2:
            try:
                l_val = float(parts[0].strip())
                h_val = float(parts[1].strip())
                return l_val, h_val, f"{l_val} - {h_val} {unit}", True
            except ValueError:
                pass

        return fallback_low, fallback_high, f"{fallback_low} - {fallback_high} {unit}", False

    def _format_difference(self, value: float, low: float, high: float, unit: str) -> str:
        """Calculate human-readable mathematical difference from reference boundaries."""
        if value < low:
            diff = round(low - value, 2)
            return f"{diff} {unit} below stated minimum ({low} {unit})"
        if value > high:
            diff = round(value - high, 2)
            return f"{diff} {unit} above stated maximum ({high} {unit})"
        return "Within stated laboratory reference interval"

    def _build_intelligent_patient_summary(
        self,
        parameters: List[Dict[str, Any]],
        user_language: str,
        report_date: Optional[str] = None,
        has_critical: bool = False,
    ) -> str:
        """Generate structured, patient-friendly report summary strictly adhering to safety rules."""
        if not parameters:
            if user_language == "hi":
                return "रिपोर्ट में से कोई मान्य लैब टेस्ट पैरामीटर नहीं पढ़ा जा सका। कृपया रिपोर्ट की साफ़ फ़ोटो या टेक्स्ट पुनः दर्ज करें।"
            elif user_language == "hinglish":
                return "Report me se standard clinical parameters detect nahi ho sake. Kripya clear document upload karein ya manually enter karein."
            return "No standardized laboratory test parameters could be reliably identified from this document. Please ensure the document is clear or enter values manually."

        normal_params = [p for p in parameters if not p["is_out_of_range"]]
        out_params = [p for p in parameters if p["is_out_of_range"]]
        total_count = len(parameters)

        lang = user_language if user_language in ["hi", "hinglish", "en"] else "en"

        sections: List[str] = []

        # Emergency Critical Alert Header if triggered
        if has_critical:
            crit_items = [p for p in parameters if p.get("is_critical")]
            crit_names = ", ".join(f"{p['name']} ({p['value']} {p['unit']})" for p in crit_items)
            if lang == "hi":
                sections.append(f"🚨 तत्काल चिकित्सा ध्यान आवश्यक (Critical Alert):\nआपके {crit_names} का मान अत्यधिक असामान्य है। कृपया बिना किसी देरी के तुरंत अपने डॉक्टर या निकटतम आपातकालीन अस्पताल (112) से संपर्क करें।")
            elif lang == "hinglish":
                sections.append(f"🚨 CRITICAL MEDICAL ALERT:\nAapke report me {crit_names} ka level significantly abnormal hai. Kripya bina kisi delay ke turant apne doctor ya emergency hospital se contact karein.")
            else:
                sections.append(f"🚨 CRITICAL VALUE ALERT:\nThe result for {crit_names} is significantly outside safe reference intervals. Please seek immediate professional medical attention or visit an emergency care facility.")

        # 1. Report Overview
        date_str = f" (Report Date: {report_date})" if report_date else ""
        if lang == "hi":
            overview = f"📋 रिपोर्ट अवलोकन{date_str}:\nइस रिपोर्ट में कुल {total_count} लैब टेस्ट पैरामीटर पहचाने गए हैं। इनमें से {len(normal_params)} पैरामीटर सामान्य सीमा में हैं और {len(out_params)} पैरामीटर प्रयोगशाला की उल्लिखित संदर्भ सीमा से बाहर हैं।"
        elif lang == "hinglish":
            overview = f"📋 Report Overview{date_str}:\nAapki report me total {total_count} lab parameters identify hue hain. Inme se {len(normal_params)} normal reference range me hain aur {len(out_params)} laboratory ki stated range se bahar hain."
        else:
            overview = f"📋 Clinical Report Overview{date_str}:\nA total of {total_count} laboratory parameters were identified. Of these, {len(normal_params)} fall within laboratory reference intervals, and {len(out_params)} are outside stated reference ranges."
        sections.append(overview)

        # 2. Parameters Within Normal Range
        if normal_params:
            if lang == "hi":
                norm_header = f"✅ सामान्य सीमा के भीतर पैरामीटर ({len(normal_params)}):"
                norm_lines = [f"• {p['name']}: {p['value']} {p['unit']} (सामान्य: {p['reference_range']})" for p in normal_params]
            elif lang == "hinglish":
                norm_header = f"✅ Normal Range me Parameters ({len(normal_params)}):"
                norm_lines = [f"• {p['name']}: {p['value']} {p['unit']} (Stated Range: {p['reference_range']})" for p in normal_params]
            else:
                norm_header = f"✅ Parameters Within Stated Reference Ranges ({len(normal_params)}):"
                norm_lines = [f"• {p['name']}: {p['value']} {p['unit']} (Reference: {p['reference_range']})" for p in normal_params]
            sections.append(f"{norm_header}\n" + "\n".join(norm_lines))

        # 3. Abnormal Parameters with Detailed Breakdown
        if out_params:
            if lang == "hi":
                abn_header = f"⚠️ संदर्भ सीमा से बाहर पैरामीटर ({len(out_params)}) — डॉक्टर से समीक्षा आवश्यक:"
                abn_blocks = []
                for p in out_params:
                    crit_mark = " [🚨 CRITICAL]" if p.get("is_critical") else ""
                    block = (
                        f"• {p['name']}{crit_mark}:\n"
                        f"  - आपका परिणाम: {p['value']} {p['unit']}\n"
                        f"  - लैब संदर्भ सीमा: {p['reference_range']}\n"
                        f"  - सीमा से अंतर: {p['difference_from_range']}\n"
                        f"  - सामान्य जानकारी: {p['description_hi']}"
                    )
                    abn_blocks.append(block)
            elif lang == "hinglish":
                abn_header = f"⚠️ Range se Bahar Parameters ({len(out_params)}) — Clinical Review Recommended:"
                abn_blocks = []
                for p in out_params:
                    crit_mark = " [🚨 CRITICAL]" if p.get("is_critical") else ""
                    block = (
                        f"• {p['name']}{crit_mark}:\n"
                        f"  - Aapka Result: {p['value']} {p['unit']}\n"
                        f"  - Lab Reference Range: {p['reference_range']}\n"
                        f"  - Range se Difference: {p['difference_from_range']}\n"
                        f"  - Simple Explanation: {p['description_hinglish']}"
                    )
                    abn_blocks.append(block)
            else:
                abn_header = f"⚠️ Parameters Outside Stated Reference Ranges ({len(out_params)}):"
                abn_blocks = []
                for p in out_params:
                    crit_mark = " [🚨 CRITICAL]" if p.get("is_critical") else ""
                    block = (
                        f"• {p['name']}{crit_mark}:\n"
                        f"  - Your Result: {p['value']} {p['unit']}\n"
                        f"  - Laboratory Reference Range: {p['reference_range']}\n"
                        f"  - Difference from Range: {p['difference_from_range']}\n"
                        f"  - General Information: {p['description']}"
                    )
                    abn_blocks.append(block)
            sections.append(f"{abn_header}\n" + "\n\n".join(abn_blocks))

            # 4. Tailored Questions to Discuss with Doctor
            doctor_questions = [p["doctor_question"] for p in out_params if p.get("doctor_question")]
            if doctor_questions:
                if lang == "hi":
                    q_header = "💬 डॉक्टर से परामर्श के लिए महत्वपूर्ण बिंदु:"
                    q_lines = [f"• {q}" for q in doctor_questions[:4]]
                elif lang == "hinglish":
                    q_header = "💬 Doctor se Consultation ke dauran poochhne ke liye zaroori points:"
                    q_lines = [f"• {q}" for q in doctor_questions[:4]]
                else:
                    q_header = "💬 Suggested Questions for Your Doctor Consultation:"
                    q_lines = [f"• {q}" for q in doctor_questions[:4]]
                sections.append(f"{q_header}\n" + "\n".join(q_lines))

        # 5. Clear Next-Step Guidance
        if lang == "hi":
            guidance = (
                "🩺 अगले कदम:\n"
                "1. इन परिणामों को अपने डॉक्टर या विशेषज्ञ से साझा करें।\n"
                "2. यह सारांश केवल जानकारी के लिए है और कोई चिकित्सीय निदान या नुस्खा नहीं है।\n"
                "3. बिना डॉक्टर की सलाह के कोई भी दवा शुरू या बंद न करें।"
            )
        elif lang == "hinglish":
            guidance = (
                "🩺 Next Steps:\n"
                "1. Is summary aur original lab report ko apne consulting doctor se zaroor discuss karein.\n"
                "2. Yeh summary sirf patient understanding ke liye hai, koi medical diagnosis ya prescription nahi hai.\n"
                "3. Doctor ke consultation ke bina koi bhi medicine start ya stop na karein."
            )
        else:
            guidance = (
                "🩺 Next Steps & Clinical Guidance:\n"
                "1. Share this complete report with your licensed healthcare provider.\n"
                "2. This automated summary organizes test results and does NOT provide a diagnosis or prescription.\n"
                "3. Do not initiate, change, or discontinue any medical treatment without qualified professional advice."
            )
        sections.append(guidance)

        return "\n\n".join(sections)


report_service = MedicalReportService()
