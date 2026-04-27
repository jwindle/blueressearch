import asyncio
from abc import ABC, abstractmethod


class Embedder(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        pass

    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]:
        pass

    @property
    def class_name(self) -> str:
        return type(self).__name__

    def get_config(self) -> dict | None:
        return None

    async def aembed(self, texts: list[str]) -> list[list[float]]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: self.embed(texts))
