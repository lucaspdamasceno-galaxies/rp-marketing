"""Remove dados mock do banco, deixando apenas:
  - Admin RP Marketing
  - Cliente RP Marketing (zerado, sem aprovações/postagens)

Uso:
    python -m app.scripts.cleanup_mocks
"""
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import Aprovacao, Cliente, Postagem, Usuario

EMPRESAS_PRESERVAR = {"RP Marketing"}
ADMINS_PRESERVAR_EMAIL = {"admin@rpmarketing.com.br"}


def main() -> None:
    with SessionLocal() as db:
        clientes_para_remover = (
            db.scalars(
                select(Cliente).where(Cliente.nome_empresa.notin_(EMPRESAS_PRESERVAR))
            ).all()
        )
        usuarios_alvo_ids = {c.usuario_id for c in clientes_para_remover}

        n_aprov = 0
        n_post = 0
        for c in clientes_para_remover:
            n_aprov += db.query(Aprovacao).filter(Aprovacao.cliente_id == c.id).delete(
                synchronize_session=False
            )
            n_post += db.query(Postagem).filter(Postagem.cliente_id == c.id).delete(
                synchronize_session=False
            )
            db.delete(c)

        n_user = 0
        for uid in usuarios_alvo_ids:
            u = db.get(Usuario, uid)
            if u and u.email not in ADMINS_PRESERVAR_EMAIL:
                db.delete(u)
                n_user += 1

        rp = db.scalar(select(Cliente).where(Cliente.nome_empresa == "RP Marketing"))
        n_rp_aprov = 0
        n_rp_post = 0
        if rp:
            n_rp_aprov = db.query(Aprovacao).filter(Aprovacao.cliente_id == rp.id).delete(
                synchronize_session=False
            )
            n_rp_post = db.query(Postagem).filter(Postagem.cliente_id == rp.id).delete(
                synchronize_session=False
            )

        db.commit()

        print(f"removidos: {len(clientes_para_remover)} clientes mock")
        print(f"           {n_user} usuarios mock")
        print(f"           {n_aprov} aprovacoes (dos mocks)")
        print(f"           {n_post} postagens (dos mocks)")
        print(f"           {n_rp_aprov} aprovacoes do RP Marketing (lixo de teste)")
        print(f"           {n_rp_post} postagens do RP Marketing (lixo de teste)")

        print()
        print("=== ESTADO FINAL ===")
        for u in db.scalars(select(Usuario).order_by(Usuario.created_at)).all():
            print(f"  {u.role.value:8s} {u.email}")
        for c in db.scalars(select(Cliente).order_by(Cliente.created_at)).all():
            print(f"  cliente: {c.nome_empresa} (ig={'conectado' if c.access_token else 'pendente'})")


if __name__ == "__main__":
    main()
