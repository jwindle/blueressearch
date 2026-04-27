import os

from docsearch.core.registry import Registry
from docsearch.embedders.sentence_transformer import SentenceTransformerEmbedder
from docsearch.factory import create_app

from .extractors import (
    EmployeeTraitsExtractor,
    JobTitleExtractor,
    JobTraitsExtractor,
    LongDescriptionExtractor,
    ShortDescriptionExtractor,
)

embedder = SentenceTransformerEmbedder("all-MiniLM-L6-v2")

registry = Registry()
registry.register_extractor(EmployeeTraitsExtractor())
registry.register_extractor(JobTraitsExtractor())
registry.register_extractor(ShortDescriptionExtractor())
registry.register_extractor(LongDescriptionExtractor())
registry.register_extractor(JobTitleExtractor())

app = create_app(registry, os.environ["DATABASE_URL"], embedder)
