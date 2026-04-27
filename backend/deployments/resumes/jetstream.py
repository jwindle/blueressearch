from jetstream.cli import run_deployment_cli


COLLECTION = "org.blueres.resume.resume"


def main() -> None:
    run_deployment_cli(
        deployment_name="resumes",
        collection=COLLECTION,
        module_name=__spec__.name if __spec__ else "deployments.resumes.jetstream",
        default_base_url="http://localhost:8000",
    )


if __name__ == "__main__":
    main()
