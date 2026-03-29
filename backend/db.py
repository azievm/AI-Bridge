from sqlalchemy import create_engine, select, delete
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Mapped, mapped_column

engine = create_engine(url="sqlite:///requests.db")
session = sessionmaker(engine)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str]


class ChatRequests(Base):
    __tablename__ = "chat_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(index=True)
    prompt: Mapped[str]
    response: Mapped[str]  # JSON-строка {description, code}


def get_user_by_email(email: str) -> User | None:
    with session() as new_session:
        query = select(User).filter_by(email=email)
        result = new_session.execute(query)
        return result.scalars().first()


def create_user(email: str, password_hash: str) -> User:
    with session() as new_session:
        user = User(email=email, password_hash=password_hash)
        new_session.add(user)
        new_session.commit()
        new_session.refresh(user)
        return user


def get_user_requests(user_id: int) -> list[ChatRequests]:
    with session() as new_session:
        query = select(ChatRequests).filter_by(user_id=user_id)
        result = new_session.execute(query)
        return result.scalars().all()


def add_request_data(user_id: int, prompt: str, response: str) -> None:
    with session() as new_session:
        # Храним только последний запрос пользователя
        new_session.execute(
            delete(ChatRequests).where(ChatRequests.user_id == user_id)
        )

        new_request = ChatRequests(
            user_id=user_id,
            prompt=prompt,
            response=response,
        )
        new_session.add(new_request)
        new_session.commit()


def delete_user_requests(user_id: int) -> int:
    with session() as new_session:
        result = new_session.execute(
            delete(ChatRequests).where(ChatRequests.user_id == user_id)
        )
        new_session.commit()
        return result.rowcount
