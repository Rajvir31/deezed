// Test setup - load env vars for testing
process.env.DATABASE_URL = "postgresql://deezed:deezed_dev_password@localhost:5432/deezed_test";
process.env.CLERK_SECRET_KEY = "sk_test_mock";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_mock";
process.env.OPENAI_API_KEY = "sk-test-mock";
process.env.S3_ENDPOINT = "http://localhost:9000";
process.env.S3_ACCESS_KEY = "deezed_minio";
process.env.S3_SECRET_KEY = "deezed_minio_secret";
process.env.S3_BUCKET = "deezed-photos-test";
process.env.NODE_ENV = "test";
