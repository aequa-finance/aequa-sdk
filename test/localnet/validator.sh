#!/usr/bin/env bash
# Starts a solana-test-validator for the SDK's localnet run, in WSL (the Windows validator can't
# create its ledger's links). Programs and accounts come from a manifest run.ts writes: mainnet
# binaries and accounts, and the aequa program upgradeable by the run's deployer. Prints the
# validator's PID; stop it with `kill <pid>`.
#
#   wsl --exec bash test/localnet/validator.sh <manifest.json> <ledger-dir> <rpc-port>
set -euo pipefail
[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
manifest="$1"
ledger="$2"
port="${3:-18999}"

args=(--reset --ledger "$ledger" --rpc-port "$port" --faucet-port $((port + 3)) --gossip-port $((port + 4)) \
  --dynamic-port-range "$((port + 10))-$((port + 60))" --limit-ledger-size 1000000 --quiet)
while IFS=$'\t' read -r kind a b c; do
  case "$kind" in
    program) args+=(--bpf-program "$a" "$b") ;;
    upgradeable) args+=(--upgradeable-program "$a" "$b" "$c") ;;
    account) args+=(--account "$a" "$b") ;;
  esac
done < <(python3 -c '
import json, sys
m = json.load(open(sys.argv[1]))
for p in m["programs"]: print("program\t%s\t%s" % (p["id"], p["path"]))
for p in m["upgradeable"]: print("upgradeable\t%s\t%s\t%s" % (p["id"], p["path"], p["authority"]))
for a in m["accounts"]: print("account\t%s\t%s" % (a["address"], a["path"]))
' "$manifest")

mkdir -p "$ledger"
RUST_LOG=warn setsid nohup solana-test-validator "${args[@]}" > "$ledger.log" 2>&1 < /dev/null &
pid=$!
disown
# The detached validator needs a moment before this session ends, or it goes with it.
sleep 2
echo "$pid"
