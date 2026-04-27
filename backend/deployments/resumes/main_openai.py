import os

from docsearch.core.registry import Registry
from docsearch.embedders.openai import OpenAIEmbedder
from docsearch.factory import create_app

from .extractors import BasicsLabelExtractor, BasicsSummaryExtractor, EducationExtractor, SkillsExtractor, WorkExtractor

embedder = OpenAIEmbedder("text-embedding-3-small")

registry = Registry()
registry.register_extractor(WorkExtractor())
registry.register_extractor(EducationExtractor())
registry.register_extractor(SkillsExtractor())
registry.register_extractor(BasicsLabelExtractor())
registry.register_extractor(BasicsSummaryExtractor())

app = create_app(registry, os.environ["DATABASE_URL"], embedder)
