from sqlalchemy import create_engine, select, delete
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Mapped, mapped_column

engine = create_engine(url="sqlite:///requests.db")
session = sessionmaker(engine)


class Base(DeclarativeBase):
    pass


class ChatRequests(Base):
    __tablename__ = "chat_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    ip_address: Mapped[str] = mapped_column(index=True)
    prompt: Mapped[str]
    response: Mapped[str]   # теперь храним JSON-строку {description, code}


def get_user_requests(ip_address: str) -> list[ChatRequests]:
    with session() as new_session:
        query = select(ChatRequests).filter_by(ip_address=ip_address)
        result = new_session.execute(query)
        return result.scalars().all()


def add_request_data(ip_address: str, prompt: str, response: str) -> None:
    with session() as new_session:
        # Удаляем ВСЁ старое для этого IP
        new_session.execute(
            delete(ChatRequests).where(ChatRequests.ip_address == ip_address)
        )
        # Добавляем новый
        new_request = ChatRequests(
            ip_address=ip_address,
            prompt=prompt,
            response=response
        )
        new_session.add(new_request)
        new_session.commit()


def delete_user_requests(ip_address: str) -> int:
    with session() as new_session:
        result = new_session.execute(
            delete(ChatRequests).where(ChatRequests.ip_address == ip_address)
        )
        new_session.commit()
        return result.rowcount
