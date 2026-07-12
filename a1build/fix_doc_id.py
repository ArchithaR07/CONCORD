import glob

paths = glob.glob('c:/Users/UMA MAHESWARI S/OneDrive/Desktop/REARCH/CONCORD/a1build/backend/engine/rules/*.py')
for p in paths:
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('"doc_id"', '"policy_file"').replace("'doc_id'", '"policy_file"')
    
    if new_content != content:
        with open(p, 'w', encoding='utf-8') as f:
            f.write(new_content)
