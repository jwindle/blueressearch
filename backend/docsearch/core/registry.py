import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from .. import tables
from .extractor import Extractor


class Registry:
    def __init__(self) -> None:
        self._extractors: dict[str, Extractor] = {}

    def register_extractor(self, extractor: Extractor) -> None:
        self._extractors[extractor.name] = extractor

    def get_extractor(self, name: str) -> Extractor:
        return self._extractors[name]

    @property
    def extractors(self) -> dict[str, Extractor]:
        return self._extractors

    async def sync_to_db(self, conn: AsyncConnection) -> None:
        for extractor in self._extractors.values():
            await conn.execute(
                pg_insert(tables.extractors)
                .values(
                    name=extractor.name,
                    class_name=extractor.class_name,
                    config=extractor.get_config(),
                )
                .on_conflict_do_update(
                    index_elements=["name"],
                    set_={
                        "class_name": extractor.class_name,
                        "config": extractor.get_config(),
                    },
                )
            )
