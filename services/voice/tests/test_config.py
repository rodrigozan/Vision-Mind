from app import config


def test_load_config_usa_os_padroes_da_fase_4(monkeypatch):
    for var in [
        "VOICE_HOST",
        "VOICE_PORT",
        "WHISPER_MODEL",
        "WHISPER_COMPUTE_TYPE",
        "WHISPER_LANGUAGE",
        "KOKORO_VOICE",
        "KOKORO_LANG",
    ]:
        monkeypatch.delenv(var, raising=False)

    cfg = config.load_config()

    assert cfg.host == "127.0.0.1"
    assert cfg.port == 8001
    assert cfg.whisper_model == "small"
    assert cfg.whisper_compute_type == "int8"
    assert cfg.whisper_language == "pt"


def test_load_config_respeita_overrides_de_ambiente(monkeypatch):
    monkeypatch.setenv("VOICE_PORT", "9009")
    monkeypatch.setenv("WHISPER_LANGUAGE", "en")

    cfg = config.load_config()

    assert cfg.port == 9009
    assert cfg.whisper_language == "en"
