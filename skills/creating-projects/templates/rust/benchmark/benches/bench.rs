use criterion::{Criterion, criterion_group, criterion_main};

fn bench(c: &mut Criterion) {
  c.bench_function("add", |b| b.iter(|| {{repo_ident}}::add(1, 2)));
}

criterion_group!(benches, bench);
criterion_main!(benches);
