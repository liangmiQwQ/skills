#[must_use]
pub const fn add(left: u64, right: u64) -> u64 {
  left + right
}

#[cfg(test)]
mod tests {
  use insta::assert_snapshot;

  use super::*;

  #[test]
  fn it_works() {
    assert_snapshot!(add(2, 2), @"4");
  }
}
