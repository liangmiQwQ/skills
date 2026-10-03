# Runs inside the generated project. Pins Vite+ to the version `@liangmi/vp-config` supports,
# and adds the other dependencies with their latest versions.
vite_plus=$(npm view @liangmi/vp-config peerDependencies.vite-plus)
cat > pnpm-workspace.yaml <<YAML
catalog:
  vite: npm:@voidzero-dev/vite-plus-core@$vite_plus
  vite-plus: $vite_plus
overrides:
  vite@*: 'catalog:'
peerDependencyRules:
  allowAny:
    - vite
  allowedVersions:
    vite: '*'
YAML
node -p 'process.versions.node.split(".")[0]' > .node-version
vp install -D vite@catalog: vite-plus@catalog: @liangmi/vp-config typescript @typescript/native-preview @types/node bumpp
