from decky_loader.reporting import Reporting, _classify_steamos_branch


def test_classify_steamos_branch_preview() -> None:
    assert _classify_steamos_branch("steamdeck-preview") == "Preview"


def test_classify_steamos_branch_main() -> None:
    assert _classify_steamos_branch("main") == "Main"


def test_classify_steamos_branch_beta() -> None:
    assert _classify_steamos_branch("beta") == "Beta"


def test_get_steam_branch_detects_beta_participation() -> None:
    reporting = Reporting.__new__(Reporting)
    config = '"BetaParticipation"\t"publicbeta"'

    assert reporting._get_steam_branch(config) == "Beta"


def test_get_steam_branch_defaults_to_stable() -> None:
    reporting = Reporting.__new__(Reporting)

    assert reporting._get_steam_branch('"BetaParticipation" ""') == "Stable"
