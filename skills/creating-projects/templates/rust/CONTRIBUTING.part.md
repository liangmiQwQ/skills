This project is built with [Rust](https://rust-lang.org/), if you aren't familiar with it, please read the [official book](https://doc.rust-lang.org/book/) to install basic Rust environment and learn the basic concepts.

We use [just](https://just.systems/) as a task runner. You can install it and easily setup project environment by running:

```bash
cargo install just
just init
```

And you can easily run the command to do formatting or code linting, you can list all available commands by running:

```bash
just
```

To make sure your code can be passed by CI, you can also preview the result by running:

```bash
just ready
```
