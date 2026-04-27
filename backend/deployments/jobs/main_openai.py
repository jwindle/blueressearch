import os

from docsearch.core.registry import Registry
from docsearch.embedders.openai import OpenAIEmbedder
from docsearch.factory import create_app

from .extractors import EmployeeTraitsConcatExtractor, JobTraitsConcatExtractor

embedder = OpenAIEmbedder("text-embedding-3-small")

registry = Registry()
registry.register_extractor(EmployeeTraitsConcatExtractor())
registry.register_extractor(JobTraitsConcatExtractor())

app = create_app(registry, os.environ["DATABASE_URL"], embedder)
