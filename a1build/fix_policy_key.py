import glob

paths = glob.glob('c:/Users/UMA MAHESWARI S/OneDrive/Desktop/REARCH/CONCORD/a1build/backend/engine/rules/*.py') + glob.glob('c:/Users/UMA MAHESWARI S/OneDrive/Desktop/REARCH/CONCORD/a1build/backend/engine/stubs/*.py')
for p in paths:
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace("['policy']", "['policy_name']").replace('["policy"]', '["policy_name"]')
    
    if new_content != content:
        with open(p, 'w', encoding='utf-8') as f:
            f.write(new_content)
