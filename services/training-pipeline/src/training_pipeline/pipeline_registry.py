"""Project pipelines."""

from kedro.framework.project import find_pipelines
from kedro.pipeline import Pipeline


def register_pipelines() -> dict[str, Pipeline]:
    """Register the project's pipelines.

    Returns:
        A mapping from pipeline names to ``Pipeline`` objects.
    """
    from .pipelines import train_ensemble as te
    from .pipelines import train_tier0 as t0
    from .pipelines import train_tier1 as t1
    from .pipelines import train_tier2 as t2
    from .pipelines import train_tier3 as t3
    from .pipelines import train_meta as tm
    from .pipelines import onnx_export as ox
    from .pipelines import evaluate_strategy as es
    from .pipelines import nlp_sentiment as nlp
    from .pipelines import iv_surface as iv

    pipelines = find_pipelines()
    pipelines["train_ensemble"] = te.create_pipeline()
    pipelines["train_tier0"] = t0.create_pipeline()
    pipelines["train_tier1"] = t1.create_pipeline()
    pipelines["train_tier2"] = t2.create_pipeline()
    pipelines["train_tier3"] = t3.create_pipeline()
    pipelines["train_meta"] = tm.create_pipeline()
    pipelines["onnx_export"] = ox.create_pipeline()
    pipelines["evaluate_strategy"] = es.create_pipeline()
    pipelines["nlp_sentiment"] = nlp.create_pipeline()
    pipelines["iv_surface"] = iv.create_pipeline()
    pipelines["__default__"] = Pipeline(
        [node for pipeline in pipelines.values() for node in pipeline.nodes]
    )
    return pipelines
