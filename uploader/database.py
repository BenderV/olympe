import os

from asyncpg import create_pool
from dotenv import load_dotenv

from server import app

load_dotenv()

URI = os.environ["DATABASE_TEST_URI"]


@app.listener("before_server_start")
async def register_db(app, loop):
    # Create a database connection pool
    app.config["pool"] = await create_pool(
        dsn=URI,
        min_size=10,  # in bytes,
        max_size=10,  # in bytes,
        max_queries=50000,
        max_inactive_connection_lifetime=300,
        loop=loop,
    )


@app.listener("after_server_stop")
async def close_connection(app, loop):
    pool = app.config["pool"]
    async with pool.acquire() as conn:
        await conn.close()
