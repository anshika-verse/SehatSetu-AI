"""Routes for Location-Based Healthcare Discovery."""

from typing import List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.schemas.models import ReverseGeocodeResponse
from app.services.places_service import places_service
from app.services.speciality_service import SPECIALITY_DISCLAIMER, suggest_specialities

router = APIRouter()


class NearbyPlacesRequest(BaseModel):
    latitude: float = Field(default=28.5672, ge=-90.0, le=90.0)
    longitude: float = Field(default=77.2100, ge=-180.0, le=180.0)
    radius_km: float = Field(default=15.0, ge=1.0, le=50.0)
    category: str = Field(default="all")
    symptoms: Optional[str] = None


class FacilityItem(BaseModel):
    id: str
    name: str
    category: str
    type_label: str
    address: str
    phone: str
    emergency_phone: Optional[str] = None
    rating: float
    user_ratings_total: int
    open_now: bool
    emergency_24x7: bool
    distance_km: float
    latitude: float
    longitude: float
    directions_url: str
    verified_booking_url: Optional[str] = None
    appointment_support: Optional[str] = None
    specialities: List[str] = Field(default_factory=list)


class NearbyPlacesResponse(BaseModel):
    source: str
    provider: str
    count: int
    facilities: List[FacilityItem]
    suggested_specialities: List[dict] = Field(default_factory=list)
    notice: Optional[str] = None
    external_links: Optional[dict] = None
    disclaimer: str


@router.get("/places/reverse-geocode", response_model=ReverseGeocodeResponse)
async def reverse_geocode_endpoint(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
) -> ReverseGeocodeResponse:
    """Convert user GPS coordinates into a verified readable location address."""
    res = await places_service.reverse_geocode(lat, lng)
    return ReverseGeocodeResponse(
        formatted_address=res.get("formatted_address", f"{lat:.4f}°, {lng:.4f}°"),
        city=res.get("city"),
        state=res.get("state"),
        area=res.get("area"),
        country=res.get("country"),
        provider=res.get("provider", "reverse_geocoding"),
    )


@router.post("/places/nearby", response_model=NearbyPlacesResponse)
async def nearby_places(body: NearbyPlacesRequest) -> NearbyPlacesResponse:
    # 1. Fetch nearby facilities using PlacesService
    data = await places_service.find_nearby_facilities(
        latitude=body.latitude,
        longitude=body.longitude,
        radius_km=body.radius_km,
        category=body.category,
    )

    # 2. Derive suggested medical specialities if symptoms are provided
    specialities: List[dict] = []
    if body.symptoms and body.symptoms.strip():
        specialities = suggest_specialities(body.symptoms)

    return NearbyPlacesResponse(
        source=data["source"],
        provider=data["provider"],
        count=data["count"],
        facilities=data.get("facilities", []),
        suggested_specialities=specialities,
        notice=data.get("notice"),
        external_links=data.get("external_links"),
        disclaimer=(
            "Facility details and distances are calculated from real coordinates for informational navigation. "
            "Call ahead or use emergency 112 in severe conditions. "
            + SPECIALITY_DISCLAIMER
        ),
    )

