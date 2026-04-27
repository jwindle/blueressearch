from sentence_transformers import SentenceTransformer

from ..core.embedder import Embedder


class SentenceTransformerEmbedder(Embedder):
    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self._model_name = model_name
        self._model = SentenceTransformer(model_name)

    @property
    def name(self) -> str:
        return f"sentence-transformer:{self._model_name}"

    @property
    def dimension(self) -> int:
        return self._model.get_sentence_embedding_dimension()

    def get_config(self) -> dict:
        return {"model_name": self._model_name}

    def embed(self, texts: list[str]) -> list[list[float]]:
        return self._model.encode(texts, show_progress_bar=False).tolist()
