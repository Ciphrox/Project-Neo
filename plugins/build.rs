use std::{env, fs, path::PathBuf};

fn main() {
    let dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());

    let mut names: Vec<String> = fs::read_dir(&dir)
        .expect("plugins dir")
        .flatten()
        .filter(|e| e.path().join("Cargo.toml").exists())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .collect();
    names.sort();

    let mut code = String::from(
        "#[allow(unused_variables)]\npub fn register_all(r: &mut neo_sdk::registry::Registry) {\n",
    );
    for n in &names {
        code.push_str(&format!(
            "    plugin_{}::register(r);\n",
            n.replace('-', "_")
        ));
    }
    code.push_str("}\n");

    let out = PathBuf::from(env::var("OUT_DIR").unwrap()).join("plugins_gen.rs");
    if fs::read_to_string(&out).unwrap_or_default() != code {
        fs::write(&out, code).expect("write plugins_gen.rs");
    }
    println!("cargo:rerun-if-changed={}", dir.display());
}
