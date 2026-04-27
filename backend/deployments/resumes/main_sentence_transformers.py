import os

from docsearch.core.registry import Registry
from docsearch.embedders.sentence_transformer import SentenceTransformerEmbedder
from docsearch.factory import create_app

from .extractors import BasicsLabelExtractor, BasicsSummaryExtractor, EducationExtractor, SkillsExtractor, WorkExtractor

embedder = SentenceTransformerEmbedder("all-MiniLM-L6-v2")

registry = Registry()
registry.register_extractor(WorkExtractor())
registry.register_extractor(EducationExtractor())
registry.register_extractor(SkillsExtractor())
registry.register_extractor(BasicsLabelExtractor())
registry.register_extractor(BasicsSummaryExtractor())

app = create_app(registry, os.environ["DATABASE_URL"], embedder)
