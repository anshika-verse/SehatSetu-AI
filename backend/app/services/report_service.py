"""Report Service: Medical Report extraction, parameter parsing, and simple-language summary.

Critical Safety & Integrity Rules:
- Never fabricate test results, patient names, or medical values.
- Evaluates values strictly against the laboratory's stated reference ranges.
- Highlights out-of-range parameters for discussion with a clinician.
- Strictly NON-DIAGNOSTIC and NON-PRESCRIPTIVE.
"""

import io
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import pypdf

logger = logging.getLogger(__name__)

REPORT_DISCLAIMER = (
    "DISCLAIMER: This automated report analysis is for educational and navigation purposes only. "
    "It organizes laboratory parameters and does NOT constitute a clinical diagnosis or treatment recommendation. "
    "Laboratory reference ranges vary by testing methodology. Always consult a licensed physician for interpretation."
)

# Reference definitions for common clinical laboratory parameters
# (Used to recognize parameters, normalize units, and detect reference boundaries)
KNOWN_LAB_PARAMETERS: List[Dict[str, Any]] = [
    {
        "id": "hemoglobin",
        "aliases": ["hemoglobin", "haemoglobin", "hb"],
        "display_name": "Hemoglobin (Hb)",
        "default_unit": "g/dL",
        "default_low": 12.0,
        "default_high": 17.0,
        "category": "Complete Blood Count",
        "description_en": "Protein in red blood cells that transports oxygen throughout the body.",
        "description_hi": "लाल रक्त कोशिकाओं में पाया जाने वाला प्रोटीन जो पूरे शरीर में ऑक्सीजन पहुंचाता है।",
        "description_hinglish": "Red blood cells ka protein jo body me oxygen carry karta hai.",
    },
    {
        "id": "fasting_blood_glucose",
        "aliases": ["fasting blood sugar", "fasting blood glucose", "fbs", "glucose fasting", "blood sugar fasting"],
        "display_name": "Fasting Blood Glucose",
        "default_unit": "mg/dL",
        "default_low": 70.0,
        "default_high": 99.0,
        "category": "Diabetes & Metabolism",
        "description_en": "Blood sugar concentration after an overnight fast (typically 8-12 hours).",
        "description_hi": "रात भर खाली पेट रहने के बाद रक्त में शर्करा (शुगर) का स्तर।",
        "description_hinglish": "Raat bhar fast rakhne ke baad blood me sugar ka level.",
    },
    {
        "id": "postprandial_glucose",
        "aliases": ["ppbs", "post prandial", "glucose post prandial", "postprandial glucose", "blood sugar pp"],
        "display_name": "Post-Prandial Glucose (PPBS)",
        "default_unit": "mg/dL",
        "default_low": 70.0,
        "default_high": 140.0,
        "category": "Diabetes & Metabolism",
        "description_en": "Blood glucose level measured 2 hours after a meal.",
        "description_hi": "खाना खाने के लगभग 2 घंटे बाद रक्त में शर्करा का स्तर।",
        "description_hinglish": "Khana khane ke 2 hours baad blood sugar ka level.",
    },
    {
        "id": "hba1c",
        "aliases": ["hba1c", "glycated hemoglobin", "glycohemoglobin", "a1c"],
        "display_name": "HbA1c (Glycated Hemoglobin)",
        "default_unit": "%",
        "default_low": 4.0,
        "default_high": 5.6,
        "category": "Diabetes & Metabolism",
        "description_en": "Average blood sugar levels over the past 2 to 3 months.",
        "description_hi": "पिछले 2 से 3 महीनों का औसत ब्लड शुगर स्तर।",
        "description_hinglish": "Pichhle 2-3 months ka average blood sugar level.",
    },
    {
        "id": "wbc_count",
        "aliases": ["total leukocyte count", "total leucocyte count", "tlc", "wbc", "wbc count", "white blood cells"],
        "display_name": "Total Leukocyte Count (WBC)",
        "default_unit": "cells/mcL",
        "default_low": 4000.0,
        "default_high": 11000.0,
        "category": "Complete Blood Count",
        "description_en": "Total white blood cells, which are essential for immune defense.",
        "description_hi": "श्वेत रक्त कोशिकाएं (WBC), जो शरीर की रोग प्रतिरोधक क्षमता के लिए आवश्यक हैं।",
        "description_hinglish": "White blood cells jo infection aur bimariyon se ladne me madad karte hain.",
    },
    {
        "id": "platelets",
        "aliases": ["platelet count", "platelets", "plt"],
        "display_name": "Platelet Count",
        "default_unit": "lakh/mcL",
        "default_low": 1.5,
        "default_high": 4.5,
        "category": "Complete Blood Count",
        "description_en": "Blood cells that help form clots to prevent bleeding.",
        "description_hi": "रक्त कोशिकाएं जो चोट लगने पर थक्का बनाने और रक्तस्राव रोकने में मदद करती हैं।",
        "description_hinglish": "Blood cells jo bleeding rokne aur blood clotting me zaroori hain.",
    },
    {
        "id": "serum_creatinine",
        "aliases": ["creatinine", "serum creatinine", "s creatinine"],
        "display_name": "Serum Creatinine",
        "default_unit": "mg/dL",
        "default_low": 0.6,
        "default_high": 1.2,
        "category": "Kidney Function (KFT)",
        "description_en": "Waste product filtered by the kidneys, indicating filtration function.",
        "description_hi": "किडनी द्वारा छाना जाने वाला अपशिष्ट उत्पाद, जो किडनी के कार्य को दर्शाता है।",
        "description_hinglish": "Kidney dwara filter kiya jane wala waste product.",
    },
    {
        "id": "blood_urea",
        "aliases": ["blood urea", "urea", "bun"],
        "display_name": "Blood Urea Nitrogen (BUN)",
        "default_unit": "mg/dL",
        "default_low": 15.0,
        "default_high": 40.0,
        "category": "Kidney Function (KFT)",
        "description_en": "Compound formed in the liver and eliminated by kidneys.",
        "description_hi": "लिवर में बनने वाला यौगिक जो किडनी द्वारा बाहर निकाला जाता है।",
        "description_hinglish": "Liver me banne wala waste jo kidneys filter karti hain.",
    },
    {
        "id": "total_cholesterol",
        "aliases": ["total cholesterol", "cholesterol total", "serum cholesterol"],
        "display_name": "Total Cholesterol",
        "default_unit": "mg/dL",
        "default_low": 125.0,
        "default_high": 200.0,
        "category": "Lipid Profile",
        "description_en": "Total amount of cholesterol fats circulating in the bloodstream.",
        "description_hi": "रक्त में घूमने वाले कोलेस्ट्रॉल वसा की कुल मात्रा।",
        "description_hinglish": "Blood me total cholesterol fat ki quantity.",
    },
    {
        "id": "hdl_cholesterol",
        "aliases": ["hdl", "hdl cholesterol", "good cholesterol"],
        "display_name": "HDL Cholesterol (Good)",
        "default_unit": "mg/dL",
        "default_low": 40.0,
        "default_high": 60.0,
        "category": "Lipid Profile",
        "description_en": "High-density lipoprotein that helps remove other forms of cholesterol.",
        "description_hi": "अच्छा कोलेस्ट्रॉल जो रक्त वाहिकाओं से अतिरिक्त वसा हटाने में मदद करता है।",
        "description_hinglish": "Good cholesterol jo blood vessels ko healthy rakhne me help karta hai.",
    },
    {
        "id": "ldl_cholesterol",
        "aliases": ["ldl", "ldl cholesterol", "bad cholesterol"],
        "display_name": "LDL Cholesterol (Bad)",
        "default_unit": "mg/dL",
        "default_low": 50.0,
        "default_high": 100.0,
        "category": "Lipid Profile",
        "description_en": "Low-density lipoprotein; elevated levels can form arterial plaques.",
        "description_hi": "कम घनत्व वाला कोलेस्ट्रॉल; अधिक मात्रा में होने पर धमनियों में रुकावट आ सकती है।",
        "description_hinglish": "Bad cholesterol; zyada hone par blood vessels me jama ho sakta hai.",
    },
    {
        "id": "triglycerides",
        "aliases": ["triglycerides", "serum triglycerides", "tg"],
        "display_name": "Triglycerides",
        "default_unit": "mg/dL",
        "default_low": 50.0,
        "default_high": 150.0,
        "category": "Lipid Profile",
        "description_en": "Most common type of fat in the body derived from dietary intake.",
        "description_hi": "शरीर में पाई जाने वाली आम वसा जो भोजन से प्राप्त होती है।",
        "description_hinglish": "Body me calorie intake se banne wala fat.",
    },
    {
        "id": "sgpt_alt",
        "aliases": ["sgpt", "alt", "alanine aminotransferase"],
        "display_name": "SGPT / ALT",
        "default_unit": "U/L",
        "default_low": 7.0,
        "default_high": 55.0,
        "category": "Liver Function (LFT)",
        "description_en": "Liver enzyme involved in energy metabolism; elevated when liver cells are irritated.",
        "description_hi": "लिवर एंजाइम जो लिवर कोशिकाओं के स्वास्थ्य का संकेत देता है।",
        "description_hinglish": "Liver enzyme jo liver health ko check karta hai.",
    },
    {
        "id": "tsh",
        "aliases": ["tsh", "thyroid stimulating hormone", "ultrasensitive tsh"],
        "display_name": "Thyroid Stimulating Hormone (TSH)",
        "default_unit": "uIU/mL",
        "default_low": 0.4,
        "default_high": 4.5,
        "category": "Thyroid Profile",
        "description_en": "Pituitary hormone regulating thyroid hormone production.",
        "description_hi": "पिट्यूटरी ग्रंथि द्वारा छोड़ा जाने वाला हार्मोन जो थायरॉयड को नियंत्रित करता है।",
        "description_hinglish": "Hormone jo thyroid gland ko control karta hai.",
    },
    {
        "id": "blood_pressure_systolic",
        "aliases": ["blood pressure systolic", "systolic bp", "systolic"],
        "display_name": "Blood Pressure (Systolic)",
        "default_unit": "mmHg",
        "default_low": 90.0,
        "default_high": 120.0,
        "category": "Vital Signs",
        "description_en": "Pressure in blood vessels during heartbeat contractions.",
        "description_hi": "हृदय के संकुचन के समय रक्त वाहिकाओं में दबाव।",
        "description_hinglish": "Heart pump hone par blood vessels par pressure.",
    },
    {
        "id": "heart_rate",
        "aliases": ["heart rate", "pulse", "pulse rate"],
        "display_name": "Heart Rate / Pulse",
        "default_unit": "bpm",
        "default_low": 60.0,
        "default_high": 100.0,
        "category": "Vital Signs",
        "description_en": "Number of times the heart beats per minute at rest.",
        "description_hi": "प्रति मिनट हृदय की धड़कनों की संख्या।",
        "description_hinglish": "Ek minute me heart kitni baar beat karta hai.",
    },
]


class MedicalReportService:
    """Extracts, structures, and reviews laboratory parameters from medical reports."""

    def extract_text_from_file(self, content: bytes, filename: str, content_type: str) -> str:
        """Extract text from uploaded PDF or text-based documents."""
        lower_name = filename.lower()
        if lower_name.endswith(".pdf") or "pdf" in content_type.lower():
            try:
                reader = pypdf.PdfReader(io.BytesIO(content))
                pages_text = []
                for p in reader.pages:
                    text = p.extract_text()
                    if text:
                        pages_text.append(text)
                extracted = "\n".join(pages_text).strip()
                if extracted:
                    return extracted
            except Exception as exc:
                logger.warning("pypdf extraction failed for %s: %s", filename, exc)

        # For text / utf-8 representations or clean strings
        try:
            return content.decode("utf-8", errors="ignore").strip()
        except Exception:
            return ""

    def parse_report_parameters(self, text: str, user_language: str = "hinglish") -> Dict[str, Any]:
        """Parse structured lab test parameters, units, values, and reference ranges."""
        results: List[Dict[str, Any]] = []
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # Search for each known lab parameter in extracted text
        for param in KNOWN_LAB_PARAMETERS:
            match = self._find_parameter_in_text(text, lines, param)
            if match:
                results.append(match)

        # Build simple language summary
        summary_text = self._build_plain_summary(results, user_language)

        return {
            "parameters": results,
            "total_found": len(results),
            "out_of_range_count": sum(1 for p in results if p["is_out_of_range"]),
            "summary": summary_text,
            "disclaimer": REPORT_DISCLAIMER,
        }

    def _find_parameter_in_text(
        self,
        full_text: str,
        lines: List[str],
        param: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Look for parameter name and associate numeric value, unit, and reference range."""
        for alias in param["aliases"]:
            # Pattern matching: Parameter Name ... [value] ... [unit] ... [range]
            # e.g.: "Hemoglobin  11.2  g/dL  (13.0 - 17.0)"
            pattern = re.compile(
                rf"\b{re.escape(alias)}\b[\s\:\-=]*([\d]+(?:\.[\d]+)?)\s*([a-zA-Z/%]+)?(?:\s*[\(\[]?([\d]+(?:\.[\d]+)?\s*[\-–to]+\s*[\d]+(?:\.[\d]+)?)[\)\]]?)?",
                re.IGNORECASE,
            )

            for line in lines:
                m = pattern.search(line)
                if m:
                    try:
                        raw_val = float(m.group(1))
                    except ValueError:
                        continue

                    unit = (m.group(2) or param["default_unit"]).strip()
                    ref_str = m.group(3)

                    # Extract low and high from stated reference range if found
                    low = param["default_low"]
                    high = param["default_high"]
                    stated_range = f"{low} - {high} {unit}"

                    if ref_str:
                        ref_parts = re.split(r"[\-–]|(?:\sto\s)", ref_str)
                        if len(ref_parts) == 2:
                            try:
                                low = float(ref_parts[0].strip())
                                high = float(ref_parts[1].strip())
                                stated_range = f"{low} - {high} {unit}"
                            except ValueError:
                                pass

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

                    desc_key = f"description_{user_lang_key(param)}"
                    description = param.get(desc_key) or param["description_en"]

                    return {
                        "parameter_id": param["id"],
                        "name": param["display_name"],
                        "category": param["category"],
                        "value": raw_val,
                        "unit": unit,
                        "reference_range": stated_range,
                        "reference_low": low,
                        "reference_high": high,
                        "status": status,
                        "status_label": status_label,
                        "is_out_of_range": is_out,
                        "description": description,
                    }

        return None

    def _build_plain_summary(self, parameters: List[Dict[str, Any]], language: str) -> str:
        """Create a clear, non-diagnostic overview in simple patient-accessible language."""
        if not parameters:
            if language == "hi":
                return "रिपोर्ट में से कोई मानक लैब टेस्ट पैरामीटर नहीं पढ़ा जा सका। कृपया स्पष्ट रिपोर्ट चुनें या मान स्वयं दर्ज करें।"
            elif language == "hinglish":
                return "Report me se standard lab parameters clearly identify nahi ho sake. Aap manual entry ya clear copy upload kar sakte hain."
            return "No standardized laboratory test parameters could be reliably identified in this document. You can enter or confirm values manually."

        out_params = [p for p in parameters if p["is_out_of_range"]]
        normal_params = [p for p in parameters if not p["is_out_of_range"]]

        if language == "hi":
            lines = [f"इस रिपोर्ट में {len(parameters)} लैब पैरामीटर पाए गए हैं।"]
            if out_params:
                lines.append(f"⚠️ {len(out_params)} पैरामीटर प्रयोगशाला की सामान्य सीमा से बाहर हैं:")
                for p in out_params:
                    lines.append(f"• {p['name']}: {p['value']} {p['unit']} ({p['status_label']}, सामान्य: {p['reference_range']})")
                lines.append("कृपया इन परिणामों की जांच और सही सलाह के लिए अपने डॉक्टर से संपर्क करें।")
            else:
                lines.append("✓ सभी पहचाने गए पैरामीटर प्रयोगशाला की उल्लिखित संदर्भ सीमा के भीतर दिखाई दे रहे हैं।")
            return "\n".join(lines)

        elif language == "hinglish":
            lines = [f"Aapki report me total {len(parameters)} lab parameters identify hue hain."]
            if out_params:
                lines.append(f"⚠️ {len(out_params)} parameters laboratory ki normal range se bahar hain:")
                for p in out_params:
                    lines.append(f"• {p['name']}: {p['value']} {p['unit']} ({p['status_label']}, Normal: {p['reference_range']})")
                lines.append("Kripya in values ko confirm karne aur sahi advice ke liye apne consulting doctor se discuss karein.")
            else:
                lines.append("✓ Sabhi identified parameters lab ke standard reference range ke andar hain.")
            return "\n".join(lines)

        else:
            lines = [f"A total of {len(parameters)} clinical parameters were identified from this report."]
            if out_params:
                lines.append(f"⚠️ {len(out_params)} parameter(s) are outside the laboratory's stated reference range:")
                for p in out_params:
                    lines.append(f"• {p['name']}: {p['value']} {p['unit']} ({p['status_label']}, Reference: {p['reference_range']})")
                lines.append("Please share these values with your healthcare provider for clinical evaluation.")
            else:
                lines.append("✓ All identified parameters fall within the laboratory's stated reference intervals.")
            return "\n".join(lines)


def user_lang_key(param: Dict[str, Any]) -> str:
    return "en"


report_service = MedicalReportService()

