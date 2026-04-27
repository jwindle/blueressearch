from jetstream.cli import run_deployment_cli


COLLECTION = "org.blueres.jobs.jobPost"


def main() -> None:
    run_deployment_cli(
        deployment_name="jobs",
        collection=COLLECTION,
        module_name=__spec__.name if __spec__ else "deployments.jobs.jetstream",
        default_base_url="http://localhost:8000",
    )


if __name__ == "__main__":
    main()
