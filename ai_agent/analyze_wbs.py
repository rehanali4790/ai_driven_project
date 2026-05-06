import json

# Read the existing app-state.json
with open('user_input_files/app-state.json', 'r') as f:
    data = json.load(f)

# Get WBS - it's a dict, not a list
wbs = data.get('wbs', {})
print('WBS type:', type(wbs))

if isinstance(wbs, dict):
    print('WBS keys:', list(wbs.keys())[:10])
    print('WBS name:', wbs.get('name', 'N/A')[:100])
    print('WBS code:', wbs.get('code', 'N/A'))
    print('WBS level:', wbs.get('level', 'N/A'))
    print('WBS type:', wbs.get('type', 'N/A'))
    children = wbs.get('children', [])
    print(f'WBS has {len(children)} children')

# Count all descendants
def count_descendants(node):
    count = len(node.get('children', []))
    for child in node.get('children', []):
        count += count_descendants(child)
    return count

if isinstance(wbs, dict):
    print(f'Total WBS descendants: {count_descendants(wbs)}')

    # Print top-level children
    print('\nTop-level WBS children:')
    for i, child in enumerate(children[:20]):
        print(f"  {i+1}. {child.get('code', 'N/A')}: {child.get('name', 'N/A')[:50]} ({child.get('type', 'N/A')})")

# Check tasks structure
tasks = data.get('tasks', [])
print(f'\nTotal tasks: {len(tasks)}')

# Get unique parent activities
parents = set()
for task in tasks:
    parents.add(task.get('parentActivity', 'Unknown'))
print(f'Unique parent activities: {len(parents)}')
for p in sorted(parents):
    print(f"  - {p}")
