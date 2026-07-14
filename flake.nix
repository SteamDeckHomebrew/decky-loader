{
  description = "Decky development environment";
  # pulls in the python deps from poetry

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    poetry2nix = {
      url = "github:nix-community/poetry2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      poetry2nix,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        p2n = (poetry2nix.lib.mkPoetry2Nix { inherit pkgs; });
      in
      {
        devShells.default =
          (p2n.mkPoetryEnv {
            projectDir = self + "/backend";
            # pyinstaller fails to compile so precompiled it is
            overrides = p2n.overrides.withDefaults (
              final: prev: {
                pyinstaller = prev.pyinstaller.override { preferWheel = true; };
                pyright = null;
              }
            );
          }).env.overrideAttrs
            (oldAttrs: {
              shellHook = ''
                PYTHONPATH=`which python`
                FILE=.vscode/settings.json
                if [ -f "$FILE" ]; then
                  jq --arg pythonpath "$PYTHONPATH" '.["python.defaultInterpreterPath"] = $pythonpath' $FILE > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
                else
                  echo "{\"python.defaultInterpreterPath\": \"$PYTHONPATH\"}" > "$FILE"
                fi
              '';
              UV_USE_IO_URING = 0; # work around node#48444
              nativeBuildInputs = with pkgs; [
                python311Packages.setuptools
              ];
              buildInputs = with pkgs; [
                nodejs_22
                nodePackages.pnpm
                poetry
                jq
                # fixes local pyright not being able to see the pythonpath properly.
                (pkgs.writeShellScriptBin "pyright" ''${pkgs.pyright}/bin/pyright --pythonpath `which python3` "$@" '')
                (pkgs.writeShellScriptBin "pyright-langserver" ''${pkgs.pyright}/bin/pyright-langserver --pythonpath `which python3` "$@" '')
                (pkgs.writeShellScriptBin "pyright-python" ''${pkgs.pyright}/bin/pyright-python --pythonpath `which python3` "$@" '')
                (pkgs.writeShellScriptBin "pyright-python-langserver" ''${pkgs.pyright}/bin/pyright-python-langserver --pythonpath `which python3` "$@" '')
              ];
            });
      }
    );
}
