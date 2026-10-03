# Runs inside the generated project. Adds dependencies with their latest versions.
cargo add insta --dev -p "$REPO"
cargo add criterion --dev -p benchmark
cargo add "$REPO" --path "crates/$REPO" --dev -p benchmark
dprint config update --yes
