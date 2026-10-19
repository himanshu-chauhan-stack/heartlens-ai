"""Security boundaries exercised with synthetic data and no external services."""
import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
import pytest
from src.api.auth import JWT_SECRET_KEY, create_access_token, decode_access_token, hash_password, verify_password
from src.rag.pipeline import _extract_pdf, _extract_docx


def test_long_password_suffix_is_part_of_new_hash():
    password = 'a' * 72 + 'first-suffix'
    hashed = hash_password(password)
    assert hashed.startswith('$bcrypt-sha256$')
    assert verify_password(password, hashed)
    assert not verify_password('a' * 72 + 'different-suffix', hashed)


def test_legacy_passwords_still_work_without_truncation_aliases():
    from passlib.hash import bcrypt
    password = 'a' * 72
    hashed = bcrypt.hash(password)
    assert verify_password(password, hashed)
    assert not verify_password(password + 'unexpected', hashed)


def test_issued_jwt_is_valid():
    assert decode_access_token(create_access_token('synthetic-user')) == 'synthetic-user'


@pytest.mark.parametrize('payload,algorithm,key', [
    ({'sub': 'synthetic-user'}, 'HS256', JWT_SECRET_KEY),
    ({'exp': datetime.now(timezone.utc) + timedelta(hours=1)}, 'HS256', JWT_SECRET_KEY),
    ({'sub': 'synthetic-user', 'exp': datetime.now(timezone.utc) - timedelta(hours=1)}, 'HS256', JWT_SECRET_KEY),
    ({'sub': 'synthetic-user', 'exp': datetime.now(timezone.utc) + timedelta(hours=1)}, 'HS384', JWT_SECRET_KEY),
    ({'sub': 'synthetic-user', 'exp': datetime.now(timezone.utc) + timedelta(hours=1)}, 'HS256', 'wrong-key-for-synthetic-test-only-1234'),
])
def test_untrusted_jwt_is_rejected(payload, algorithm, key):
    assert decode_access_token(jwt.encode(payload, key, algorithm=algorithm)) is None


@pytest.mark.parametrize('parser,target', [(_extract_pdf, 'pdfplumber.open'), (_extract_docx, 'docx.Document')])
def test_document_errors_do_not_echo_internal_data(parser, target):
    with patch(target, side_effect=RuntimeError('SENSITIVE_SENTINEL')):
        with pytest.raises(ValueError) as error:
            parser(b'synthetic invalid document')
        assert 'SENSITIVE_SENTINEL' not in str(error.value)


def test_model_info_does_not_disclose_filesystem_path():
    from src.api.app import model_info
    assert asyncio.run(model_info()).model_path is None
