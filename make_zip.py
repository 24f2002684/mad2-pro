# make_zip.py
# Standard library utility to create a clean submission ZIP archive for MAD-II EMP-V2.
# Builds ../mad2-pro_submission.zip containing the project under a single top-level folder.
# Excludes virtual environments, caches, SQLite databases, logs, and git metadata.

import os
import sys
import zipfile

def should_exclude(rel_path):
    # Splits path parts for clean directory matching across OSes
    parts = rel_path.replace("\\", "/").split("/")

    # Excluded directory names
    excluded_dirs = {
        ".git", "venv", ".venv", "env", "ENV", "__pycache__",
        ".idea", ".vscode", "node_modules", ".antigravity", "instance"
    }
    for part in parts[:-1]:
        if part in excluded_dirs:
            return True

    filename = parts[-1]

    # Excluded filename patterns & extensions
    if filename == ".DS_Store" or filename == "Thumbs.db":
        return True
    if filename.startswith("celerybeat-schedule"):
        return True
    if filename.endswith(".pyc") or filename.endswith(".pyo") or filename.endswith(".pyd"):
        return True
    if filename.endswith(".db") or filename.endswith(".db-shm") or filename.endswith(".db-wal"):
        return True
    if filename.endswith(".sqlite") or filename.endswith(".sqlite3"):
        return True
    if filename.endswith(".log") or filename == "outbox.log":
        return True
    if filename.endswith(".zip") or filename.endswith(".tar.gz"):
        return True
    if filename == "dump.rdb":
        return True

    # In exports directory, exclude generated CSV files (keep .gitkeep)
    if len(parts) >= 2 and parts[0] == "exports" and filename.endswith(".csv"):
        return True

    return False

def build_zip():
    project_root = os.path.abspath(os.path.dirname(__file__))
    parent_dir = os.path.dirname(project_root)
    zip_filename = "mad2-pro_submission.zip"
    zip_path = os.path.join(parent_dir, zip_filename)
    top_level_folder = "mad2-pro"

    print("=" * 70)
    print("CREATING SUBMISSION ZIP ARCHIVE")
    print(f"Source Directory:      {project_root}")
    print(f"Destination Archive:   {zip_path}")
    print(f"Top-Level Folder:      {top_level_folder}/")
    print("=" * 70)

    # Remove existing zip if present
    if os.path.exists(zip_path):
        try:
            os.remove(zip_path)
        except Exception as e:
            print(f"Warning: Could not remove existing zip: {e}")

    added_files = 0
    total_uncompressed = 0

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(project_root):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if not should_exclude(os.path.relpath(os.path.join(root, d), project_root))]

            for file in sorted(files):
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, project_root)

                if should_exclude(rel_path):
                    continue

                archive_name = f"{top_level_folder}/{rel_path.replace(os.sep, '/')}"
                file_size = os.path.getsize(abs_path)
                zipf.write(abs_path, arcname=archive_name)

                added_files += 1
                total_uncompressed += file_size
                print(f"  + [{file_size:>9} bytes] {archive_name}")

    compressed_size = os.path.getsize(zip_path)
    print("=" * 70)
    print("ARCHIVE CREATED SUCCESSFULLY!")
    print(f"Total Files Added:     {added_files}")
    print(f"Uncompressed Size:     {total_uncompressed:,} bytes ({total_uncompressed / (1024*1024):.2f} MB)")
    print(f"Compressed Archive:    {compressed_size:,} bytes ({compressed_size / (1024*1024):.2f} MB)")
    print(f"Archive Location:      {zip_path}")
    print("=" * 70)
    return zip_path

if __name__ == "__main__":
    build_zip()
