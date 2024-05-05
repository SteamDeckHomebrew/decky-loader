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

  outputs = { self, nixpkgs, flake-utils, poetry2nix }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        p2n = (poetry2nix.lib.mkPoetry2Nix { inherit pkgs; });
      in {
        devShells.default = (p2n.mkPoetryEnv {
          projectDir = self + "/backend";
          # pyinstaller fails to compile so precompiled it is
          overrides = p2n.overrides.withDefaults (final: prev: {
            pyinstaller = prev.pyinstaller.override { preferWheel = true; };
            pyright = null;
          });
        }).env.overrideAttrs (oldAttrs: {
          buildInputs = with pkgs; [
            nodejs_22
            nodePackages.pnpm
            poetry
            # "temporary" "solution" to pyright not being able to see the pythonpath properly.
            (pkgs.writeShellScriptBin "pyright" ''
              ${pkgs.pyright}/bin/pyright --pythonpath `which python3` "$@" '')
            (pkgs.writeShellScriptBin "pyright-langserver" ''
              ${pkgs.pyright}/bin/pyright-langserver --pythonpath `which python3` "$@" '')
            (pkgs.writeShellScriptBin "pyright-python" ''
              ${pkgs.pyright}/bin/pyright-python --pythonpath `which python3` "$@" '')
            (pkgs.writeShellScriptBin "pyright-python-langserver" ''
              ${pkgs.pyright}/bin/pyright-python-langserver --pythonpath `which python3` "$@" '')
          ];
        });
      });
}
