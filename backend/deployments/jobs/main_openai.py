import os

from docsearch.core.registry import Registry
from docsearch.embedders.openai import OpenAIEmbedder
from docsearch.factory import create_app

from .extractors import EmployeeTraitsExtractor, JobTraitsExtractor

embedder = OpenAIEmbedder("text-embedding-3-small")

registry = Registry()
registry.register_extractor(EmployeeTraitsExtractor())
registry.register_extractor(JobTraitsExtractor())

app = create_app(registry, os.environ["DATABASE_URL"], embedder)
