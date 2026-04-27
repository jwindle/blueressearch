from fastapi import APIRouter, Depends

from ..core.registry import Registry
from .dependencies import get_registry
from .schemas import ExtractorResponse

router = APIRouter(prefix="/extractors", tags=["extractors"])


@router.get("", response_model=list[ExtractorResponse])
async def list_extractors(
    registry: Registry = Depends(get_registry),
) -> list[ExtractorResponse]:
    return [
        ExtractorResponse(
            name=name,
            class_name=ext.class_name,
            keys=ext.get_keys(),
            config=ext.get_config(),
        )
        for name, ext in registry.extractors.items()
    ]
