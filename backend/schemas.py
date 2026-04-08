"""Pydantic schemas for API input validation."""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class ApplicationCreate(BaseModel):
    """Schema for creating an application."""

    company_name: str = Field(..., min_length=1, max_length=255)
    job_title: str = Field(..., min_length=1, max_length=255)
    date_submitted: str = Field(..., min_length=10)
    company_domain: Optional[str] = Field(None, max_length=255)
    job_url: Optional[str] = Field(None, max_length=2048)

    @validator("company_name", "job_title")
    def sanitize_text(cls, v):
        """Ensure no suspicious characters."""
        if v and not all(c.isprintable() or c.isspace() for c in v):
            raise ValueError("Contains non-printable characters")
        return v.strip()

    @validator("job_url")
    def validate_url(cls, v):
        """Ensure URLs are valid."""
        if v and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class ApplicationUpdate(BaseModel):
    """Schema for updating an application."""

    status: Optional[str] = Field(None, min_length=1, max_length=100)

    @validator("status")
    def validate_status(cls, v):
        """Ensure status is in allowed values."""
        allowed = ["Submitted", "More Info Required", "Interview Started", "Denied", "Offered"]
        if v and v not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return v


class InteractionCreate(BaseModel):
    """Schema for creating an interaction."""

    type_: str = Field(..., alias="type", min_length=1, max_length=100)
    content: Optional[str] = Field(None, max_length=5000)
    occurred_at: Optional[str] = None
    suggested_stage_change: Optional[str] = None

    class Config:
        populate_by_name = True


class EmailLink(BaseModel):
    """Schema for linking an email to an application."""

    app_id: int = Field(..., gt=0)


class StageSuggestionUpdate(BaseModel):
    """Schema for updating a stage suggestion."""

    action: str = Field(..., min_length=1, max_length=20)
    app_id: Optional[int] = Field(None, gt=0)

    @validator("action")
    def validate_action(cls, v):
        """Ensure action is valid."""
        if v not in ["confirm", "dismiss"]:
            raise ValueError("Action must be 'confirm' or 'dismiss'")
        return v


class SyncScheduleUpdate(BaseModel):
    """Schema for updating sync schedule."""

    schedule: str = Field(..., min_length=1, max_length=50)

    @validator("schedule")
    def validate_schedule(cls, v):
        """Ensure schedule is valid."""
        allowed = ["daily", "every_4_hours", "manual_only"]
        if v not in allowed:
            raise ValueError(f"Schedule must be one of: {', '.join(allowed)}")
        return v
