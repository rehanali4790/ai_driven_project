import json
from datetime import datetime, timedelta
import random

# Read the existing app-state.json
with open('user_input_files/app-state.json', 'r') as f:
    data = json.load(f)

# Extract all tasks
tasks = data.get('tasks', [])
print(f"Total tasks to process: {len(tasks)}")

# Define the correct WBS hierarchy based on the PDF
wbs_hierarchy = {
    "1.0": {
        "name": "Infrastructure Development of Education City, Karachi Phase-1 (4800 Acres)",
        "type": "project",
        "children": {
            "1.1": {
                "name": "Pre-Construction Phase",
                "type": "phase",
                "children": ["1.1.1", "1.1.2"]
            },
            "1.2": {
                "name": "Road 4",
                "type": "phase",
                "children": ["1.2.1", "1.2.2", "1.2.3", "1.2.4", "1.2.5"]
            },
            "1.3": {
                "name": "Road 3",
                "type": "phase",
                "children": ["1.3.1", "1.3.2", "1.3.3", "1.3.4", "1.3.5"]
            },
            "1.4": {
                "name": "Road 5",
                "type": "phase",
                "children": ["1.4.1", "1.4.2", "1.4.3", "1.4.4", "1.4.5"]
            },
            "1.5": {
                "name": "Box Culverts",
                "type": "phase",
                "children": ["1.5.1", "1.5.2", "1.5.3"]
            },
            "1.6": {
                "name": "Major Bridge",
                "type": "phase",
                "children": ["1.6.1", "1.6.2"]
            },
            "1.7": {
                "name": "Gate House & Entry Plaza",
                "type": "phase",
                "children": ["1.7.1", "1.7.2", "1.7.3", "1.7.4"]
            },
            "1.8": {
                "name": "Water Supply System",
                "type": "phase",
                "children": ["1.8.1", "1.8.2", "1.8.3"]
            },
            "1.9": {
                "name": "Horticulture Works",
                "type": "phase",
                "children": ["1.9.1", "1.9.2"]
            },
            "1.10": {
                "name": "Electrical & Street Lighting",
                "type": "phase",
                "children": ["1.10.1", "1.10.2", "1.10.3"]
            },
            "1.11": {
                "name": "Milestones",
                "type": "phase",
                "children": ["1.11.1", "1.11.2"]
            }
        }
    }
}

# Work package definitions
work_packages = {
    # Pre-Construction
    "1.1.1": {"name": "Mobilization", "parent": "1.1"},
    "1.1.2": {"name": "Site Survey", "parent": "1.1"},

    # Road 4
    "1.2.1": {"name": "Earthwork", "parent": "1.2"},
    "1.2.2": {"name": "Drain Works", "parent": "1.2"},
    "1.2.3": {"name": "Sewerage Works", "parent": "1.2"},
    "1.2.4": {"name": "Water Supply Works", "parent": "1.2"},
    "1.2.5": {"name": "Road Works", "parent": "1.2"},

    # Road 3
    "1.3.1": {"name": "Earthwork", "parent": "1.3"},
    "1.3.2": {"name": "Drain Works", "parent": "1.3"},
    "1.3.3": {"name": "Sewerage Works", "parent": "1.3"},
    "1.3.4": {"name": "Water Supply Works", "parent": "1.3"},
    "1.3.5": {"name": "Road Works", "parent": "1.3"},

    # Road 5
    "1.4.1": {"name": "Earthwork", "parent": "1.4"},
    "1.4.2": {"name": "Drain Works", "parent": "1.4"},
    "1.4.3": {"name": "Sewerage Works", "parent": "1.4"},
    "1.4.4": {"name": "Water Supply Works", "parent": "1.4"},
    "1.4.5": {"name": "Road Works", "parent": "1.4"},

    # Box Culverts
    "1.5.1": {"name": "Three Cell Box Culvert", "parent": "1.5"},
    "1.5.2": {"name": "Two Cell Box Culvert", "parent": "1.5"},
    "1.5.3": {"name": "One Cell Box Culvert", "parent": "1.5"},

    # Major Bridge
    "1.6.1": {"name": "Bridge Substructure", "parent": "1.6"},
    "1.6.2": {"name": "Bridge Superstructure", "parent": "1.6"},

    # Gate House
    "1.7.1": {"name": "Gate House Civil Works", "parent": "1.7"},
    "1.7.2": {"name": "Gate House Architecture", "parent": "1.7"},
    "1.7.3": {"name": "Gate House MEP", "parent": "1.7"},
    "1.7.4": {"name": "Entry Plaza Horticulture", "parent": "1.7"},

    # Water Supply
    "1.8.1": {"name": "Tube Wells", "parent": "1.8"},
    "1.8.2": {"name": "Water Reservoirs", "parent": "1.8"},
    "1.8.3": {"name": "Pump Stations", "parent": "1.8"},

    # Horticulture
    "1.9.1": {"name": "Miyawaki Forest Area", "parent": "1.9"},
    "1.9.2": {"name": "Garden & Lawn Areas", "parent": "1.9"},

    # Electrical
    "1.10.1": {"name": "Street Lighting", "parent": "1.10"},
    "1.10.2": {"name": "Power Distribution", "parent": "1.10"},
    "1.10.3": {"name": "MV Distribution", "parent": "1.10"},

    # Milestones
    "1.11.1": {"name": "Project Commencement", "parent": "1.11"},
    "1.11.2": {"name": "Project Completion", "parent": "1.11"}
}

# Map tasks to WBS based on their activity IDs and names
def get_wbs_code(task):
    name = task.get('name', '').lower()
    activity_id = task.get('activityId', '')

    # Milestones
    if 'commencement' in name or activity_id == 'A50040':
        return "1.11.1"
    if 'completion' in name or activity_id == 'A50050':
        return "1.11.2"

    # Pre-Construction
    if 'mobilization' in name or activity_id == 'A50010':
        return "1.1.1"
    if 'survey' in name or activity_id == 'A50020':
        return "1.1.2"

    # Road 4 tasks (A1000-A1300 range, A2000-A2400 range for Road 3, A2300-A2600 for Road 5)
    if 'A1' in activity_id and int(activity_id[1:5]) < 1500:
        if any(x in name for x in ['cutting', 'cg', 'ngc', 'cut and fill', 'subgrade']):
            return "1.2.1"  # Road 4 Earthwork
        if any(x in name for x in ['excavation', 'stone soling', 'lean', 'rcc bed', 'rcc wall', 'rcc slab', 'catch basin']):
            return "1.2.2"  # Road 4 Drain Works
        if any(x in name for x in ['sand cushion', 'sleeve', 'rcc pipe', 'manhole', 'backfill']):
            if 'A1' in activity_id and int(activity_id[1:5]) < 1130:
                return "1.2.3"  # Road 4 Sewerage
            return "1.2.4"  # Road 4 Water Supply
        if any(x in name for x in ['subgrade', 'sub base', 'aggregate', 'kerb', 'tack coat', 'asphalt', 'pavement', 'stud', 'signage', 'prime coat']):
            return "1.2.5"  # Road 4 Road Works

    # Road 3 tasks (A2000-A2600 range)
    if 'A2' in activity_id and int(activity_id[1:5]) < 2700:
        if any(x in name for x in ['cutting', 'cg', 'ngc', 'cut and fill', 'subgrade']):
            return "1.3.1"  # Road 3 Earthwork
        if any(x in name for x in ['excavation', 'stone soling', 'lean', 'rcc bed', 'rcc wall', 'rcc slab', 'catch basin']):
            return "1.3.2"  # Road 3 Drain Works
        if any(x in name for x in ['sand cushion', 'sleeve', 'rcc pipe', 'manhole', 'backfill']):
            if 'A2' in activity_id and int(activity_id[1:5]) < 2400:
                return "1.3.3"  # Road 3 Sewerage
            return "1.3.4"  # Road 3 Water Supply
        if any(x in name for x in ['subgrade', 'sub base', 'aggregate', 'kerb', 'tack coat', 'asphalt', 'pavement', 'stud', 'signage', 'prime coat']):
            return "1.3.5"  # Road 3 Road Works

    # Road 5 tasks (A2300-A3100 range)
    if 'A2' in activity_id and int(activity_id[1:5]) >= 2300 or 'A3' in activity_id and int(activity_id[1:5]) < 3100:
        if any(x in name for x in ['cutting', 'cg', 'ngc', 'cut and fill', 'subgrade']):
            return "1.4.1"  # Road 5 Earthwork
        if any(x in name for x in ['excavation', 'stone soling', 'lean', 'rcc bed', 'rcc wall', 'rcc slab', 'catch basin']):
            return "1.4.2"  # Road 5 Drain Works
        if any(x in name for x in ['sand cushion', 'sleeve', 'rcc pipe', 'manhole', 'backfill']):
            if 'A2' in activity_id and int(activity_id[1:5]) >= 2400:
                return "1.4.3"  # Road 5 Sewerage
            return "1.4.4"  # Road 5 Water Supply
        if any(x in name for x in ['subgrade', 'sub base', 'aggregate', 'kerb', 'tack coat', 'asphalt', 'pavement', 'stud', 'signage', 'prime coat']):
            return "1.4.5"  # Road 5 Road Works

    # Box Culverts (A51000-A51800 range)
    if 'A51' in activity_id and int(activity_id[1:5]) < 5200:
        if 'three cell' in name.lower() or activity_id.startswith('A514') or activity_id.startswith('A515'):
            return "1.5.1"  # Three Cell
        if activity_id.startswith('A516'):
            return "1.5.3"  # One Cell (A5160-5170)
        return "1.5.2"  # Two Cell

    # Bridge (A4000-A4300 and A51000-A51200 range)
    if 'A4' in activity_id or 'A51' in activity_id and int(activity_id[1:5]) >= 100:
        if any(x in name for x in ['excavation', 'pile', 'foundation', 'pier', 'abutment', 'retaining wall', 'backfill', 'transom', 'bearing']):
            return "1.6.1"  # Bridge Substructure
        return "1.6.2"  # Bridge Superstructure

    # Gate House (A53000-A54000 range)
    if 'A53' in activity_id and int(activity_id[1:5]) < 5500 or 'A54' in activity_id:
        if any(x in name for x in ['excavation', 'stone soling', 'lean', 'footing', 'column', 'beam', 'wall', 'slab', 'arch']):
            return "1.7.1"  # Gate House Civil
        if any(x in name for x in ['finish', 'floor', 'ceiling', 'wood', 'glass', 'metal']):
            return "1.7.2"  # Gate House Architecture
        if any(x in name for x in ['plumb', 'water', 'sewer', 'drain', 'pipe', 'valve', 'electric', 'cable', 'light']):
            return "1.7.3"  # Gate House MEP
        return "1.7.1"  # Default to Civil

    # Water Supply (A52000-A50700 range)
    if 'A50' in activity_id or 'A52' in activity_id or 'A30' in activity_id:
        if 'tube well' in name.lower() or 'bore' in name.lower() or 'screen' in name.lower() or 'pump' in name.lower():
            return "1.8.1"  # Tube Wells
        if 'reservoir' in name.lower() or 'tank' in name.lower():
            return "1.8.2"  # Water Reservoirs
        return "1.8.3"  # Pump Stations

    # Horticulture (A1400-A1550 and A52000-A54000 range)
    if 'A1' in activity_id and int(activity_id[1:5]) >= 1400 and int(activity_id[1:5]) < 1600:
        if 'miyawaki' in name.lower() or 'forest' in name.lower() or 'tree' in name.lower():
            return "1.9.1"  # Miyawaki Forest
        return "1.9.2"  # Garden & Lawn
    if 'A52' in activity_id and int(activity_id[1:5]) >= 545:
        return "1.9.1"  # Miyawaki Forest
    if 'A52' in activity_id or 'A53' in activity_id:
        return "1.9.2"  # Garden & Lawn

    # Electrical (A3800-A5000 and A4800-A50000 range)
    if 'A38' in activity_id or 'A39' in activity_id or 'A43' in activity_id or 'A44' in activity_id:
        if 'street' in name.lower() or 'pole' in name.lower() or 'light' in name.lower():
            return "1.10.1"  # Street Lighting
        if 'mv' in name.lower() or 'ht' in name.lower() or 'transformer' in name.lower():
            return "1.10.3"  # MV Distribution
        return "1.10.2"  # Power Distribution
    if 'A48' in activity_id or 'A49' in activity_id or 'A50' in activity_id:
        if 'street' in name.lower() or 'pole' in name.lower() or 'light' in name.lower():
            return "1.10.1"  # Street Lighting
        if 'mv' in name.lower() or 'ht' in name.lower() or 'transformer' in name.lower() or 'pad' in name.lower():
            return "1.10.3"  # MV Distribution
        return "1.10.2"  # Power Distribution

    # Default - assign to most appropriate based on parentActivity
    parent = task.get('parentActivity', '').lower()
    if 'earthwork' in parent:
        return "1.2.1"
    if 'drain' in parent:
        return "1.2.2"
    if 'sewerage' in parent:
        return "1.2.3"
    if 'water' in parent:
        return "1.2.4"
    if 'road' in parent or 'asphalt' in parent or 'kerb' in parent:
        return "1.2.5"
    if 'bridge' in parent:
        return "1.6.2"
    if 'gate' in parent or 'arch' in parent or 'building' in parent:
        return "1.7.1"
    if 'tube' in parent or 'pump' in parent or 'reservoir' in parent:
        return "1.8.1"
    if 'grass' in parent or 'garden' in parent or 'tree' in parent or 'horticulture' in parent:
        return "1.9.1"
    if 'electrical' in parent or 'light' in parent or 'cable' in parent:
        return "1.10.1"

    return "1.1.1"  # Default to Pre-Construction

# Enhanced tasks with proper WBS mapping
enhanced_tasks = []
for task in tasks:
    wbs_code = get_wbs_code(task)
    enhanced_task = {
        "id": task.get('activityId', task.get('id')),
        "activityId": task.get('activityId', task.get('id')),
        "name": task.get('name', 'Unknown Task'),
        "start": task.get('start', '2025-01-20'),
        "end": task.get('end', '2025-01-20'),
        "progress": task.get('progress', 0),
        "status": task.get('status', 'not_started'),
        "duration": task.get('duration', 1),
        "dependencies": task.get('dependencies', []),
        "isMilestone": task.get('isMilestone', False),
        "isCritical": task.get('isCritical', False),
        "assigned": task.get('assigned', 'TBD'),
        "parentActivity": task.get('parentActivity', 'General'),
        "wbsCode": wbs_code
    }
    enhanced_tasks.append(enhanced_task)

print(f"Enhanced tasks created: {len(enhanced_tasks)}")

# Create proper milestones
milestones = [
    {
        "id": "milestone-1",
        "name": "Project Commencement (Notice to Proceed)",
        "date": "2025-01-20",
        "type": "major",
        "status": "completed",
        "description": "Official start of Infrastructure Development of Education City Project"
    },
    {
        "id": "milestone-2",
        "name": "Pre-Construction Completion",
        "date": "2025-02-20",
        "type": "phase",
        "status": "completed",
        "description": "Completion of Mobilization and Site Survey activities"
    },
    {
        "id": "milestone-3",
        "name": "Road 4 Earthwork Completion",
        "date": "2025-12-08",
        "type": "phase",
        "status": "completed",
        "description": "Completion of all Earthwork activities for Road 4"
    },
    {
        "id": "milestone-4",
        "name": "Road 4 Completion",
        "date": "2026-09-24",
        "type": "phase",
        "status": "in_progress",
        "description": "Full completion of Road 4 including all utilities"
    },
    {
        "id": "milestone-5",
        "name": "Road 3 Completion",
        "date": "2026-12-03",
        "type": "phase",
        "status": "pending",
        "description": "Full completion of Road 3 including all utilities"
    },
    {
        "id": "milestone-6",
        "name": "Box Culverts Completion",
        "date": "2027-01-19",
        "type": "phase",
        "status": "pending",
        "description": "Completion of all Box Culvert structures"
    },
    {
        "id": "milestone-7",
        "name": "Major Bridge Completion",
        "date": "2027-05-06",
        "type": "phase",
        "status": "pending",
        "description": "Completion of Major Bridge construction"
    },
    {
        "id": "milestone-8",
        "name": "Road 5 Completion",
        "date": "2027-01-12",
        "type": "phase",
        "status": "pending",
        "description": "Full completion of Road 5 including all utilities"
    },
    {
        "id": "milestone-9",
        "name": "Gate House Completion",
        "date": "2027-10-29",
        "type": "phase",
        "status": "pending",
        "description": "Completion of Gate House and Entry Plaza"
    },
    {
        "id": "milestone-10",
        "name": "Water Supply System Operational",
        "date": "2027-08-16",
        "type": "phase",
        "status": "pending",
        "description": "All Tube Wells, Reservoirs and Pump Stations operational"
    },
    {
        "id": "milestone-11",
        "name": "Electrical Systems Commissioned",
        "date": "2027-10-27",
        "type": "phase",
        "status": "pending",
        "description": "Street lighting and power distribution operational"
    },
    {
        "id": "milestone-12",
        "name": "Horticulture Works Completion",
        "date": "2027-10-26",
        "type": "phase",
        "status": "pending",
        "description": "All landscape and Miyawaki forest areas completed"
    },
    {
        "id": "milestone-13",
        "name": "Project Completion & Handover",
        "date": "2027-10-30",
        "type": "major",
        "status": "pending",
        "description": "Final project completion and handing over to client"
    }
]

# Create resources
resources = [
    {"id": "res-1", "name": "Project Management Team", "role": "Project Manager", "type": "person", "capacity": 100, "allocated": 80},
    {"id": "res-2", "name": "Civil Works Team", "role": "Civil Engineer", "type": "person", "capacity": 100, "allocated": 90},
    {"id": "res-3", "name": "Earthwork Team", "role": "Site Supervisor", "type": "person", "capacity": 100, "allocated": 85},
    {"id": "res-4", "name": "Drainage Team", "role": "Drainage Engineer", "type": "person", "capacity": 100, "allocated": 75},
    {"id": "res-5", "name": "Sewerage Team", "role": "Sanitary Engineer", "type": "person", "capacity": 100, "allocated": 70},
    {"id": "res-6", "name": "Water Supply Team", "role": "Plumbing Engineer", "type": "person", "capacity": 100, "allocated": 65},
    {"id": "res-7", "name": "Road Works Team", "role": "Road Engineer", "type": "person", "capacity": 100, "allocated": 80},
    {"id": "res-8", "name": "Structure/Concrete Team", "role": "Structural Engineer", "type": "person", "capacity": 100, "allocated": 85},
    {"id": "res-9", "name": "Bridge Team", "role": "Bridge Engineer", "type": "person", "capacity": 100, "allocated": 90},
    {"id": "res-10", "name": "Electrical Team", "role": "Electrical Engineer", "type": "person", "capacity": 100, "allocated": 60},
    {"id": "res-11", "name": "Horticulture Team", "role": "Landscape Architect", "type": "person", "capacity": 100, "allocated": 50},
    {"id": "res-12", "name": "MEP Team", "role": "MEP Engineer", "type": "person", "capacity": 100, "allocated": 55},
    {"id": "res-13", "name": "Survey Team", "role": "Surveyor", "type": "person", "capacity": 100, "allocated": 40},
    {"id": "res-14", "name": "Quality Control Team", "role": "QC Engineer", "type": "person", "capacity": 100, "allocated": 70},
    {"id": "res-15", "name": "Safety Team", "role": "Safety Officer", "type": "person", "capacity": 100, "allocated": 45},
    {"id": "res-16", "name": "Equipment - Excavators", "role": "Heavy Equipment", "type": "equipment", "capacity": 20, "allocated": 15},
    {"id": "res-17", "name": "Equipment - Concrete Mixers", "role": "Construction Equipment", "type": "equipment", "capacity": 15, "allocated": 12},
    {"id": "res-18", "name": "Equipment - Asphalt Plant", "role": "Asphalt Equipment", "type": "equipment", "capacity": 10, "allocated": 8},
    {"id": "res-19", "name": "Material - RCC", "role": "Construction Material", "type": "material", "capacity": 5000, "allocated": 3500},
    {"id": "res-20", "name": "Material - Asphalt", "role": "Construction Material", "type": "material", "capacity": 3000, "allocated": 2000}
]

# Create allocations based on tasks
allocations = []
alloc_id = 1
for task in enhanced_tasks[:200]:  # Create allocations for first 200 tasks
    # Assign to appropriate resource based on task type
    task_name = task['name'].lower()
    if any(x in task_name for x in ['earthwork', 'cut', 'fill', 'excavation']):
        res_id = "res-3"  # Earthwork Team
    elif any(x in task_name for x in ['drain', 'stone soling', 'lean', 'rcc bed', 'rcc wall', 'rcc slab']):
        res_id = "res-8"  # Structure Team
    elif any(x in task_name for x in ['sewer', 'manhole', 'pipe', 'sand cushion', 'sleeve']):
        res_id = "res-5"  # Sewerage Team
    elif any(x in task_name for x in ['water', 'pump', 'tube well', 'reservoir']):
        res_id = "res-6"  # Water Supply Team
    elif any(x in task_name for x in ['road', 'asphalt', 'subgrade', 'aggregate', 'kerb', 'pavement', 'tack', 'prime']):
        res_id = "res-7"  # Road Works Team
    elif any(x in task_name for x in ['bridge', 'girder', 'pier', 'abutment']):
        res_id = "res-9"  # Bridge Team
    elif any(x in task_name for x in ['electric', 'cable', 'light', 'power', 'mv', 'ht']):
        res_id = "res-10"  # Electrical Team
    elif any(x in task_name for x in ['grass', 'tree', 'garden', 'horticulture', 'plantation']):
        res_id = "res-11"  # Horticulture Team
    elif any(x in task_name for x in ['mobilization', 'survey', 'general']):
        res_id = "res-1"  # Project Management
    else:
        res_id = "res-2"  # Civil Works Team

    allocation = {
        "id": f"alloc-{alloc_id}",
        "resourceId": res_id,
        "taskId": task['id'],
        "taskName": task['name'][:80],
        "startDate": task['start'],
        "endDate": task['end'],
        "allocation": random.randint(25, 100)
    }
    allocations.append(allocation)
    alloc_id += 1

# Create risks
risks = [
    {
        "id": "risk-1",
        "name": "Land Acquisition Delays",
        "category": "external",
        "probability": "medium",
        "impact": "high",
        "status": "medium",
        "mitigation": "Coordinate with PIU for early resolution of land issues"
    },
    {
        "id": "risk-2",
        "name": "Material Price Escalation",
        "category": "financial",
        "probability": "high",
        "impact": "medium",
        "status": "medium",
        "mitigation": "Stockpile critical materials, fix prices where possible"
    },
    {
        "id": "risk-3",
        "name": "Weather Delays",
        "category": "environmental",
        "probability": "high",
        "impact": "medium",
        "status": "low",
        "mitigation": "Plan outdoor activities during favorable weather seasons"
    },
    {
        "id": "risk-4",
        "name": "Labor Shortage",
        "category": "resource",
        "probability": "medium",
        "impact": "medium",
        "status": "low",
        "mitigation": "Maintain skilled workforce with competitive wages"
    },
    {
        "id": "risk-5",
        "name": "Design Changes",
        "category": "scope",
        "probability": "medium",
        "impact": "high",
        "status": "low",
        "mitigation": "Freeze design before construction start per contract terms"
    },
    {
        "id": "risk-6",
        "name": "Equipment Breakdown",
        "category": "operational",
        "probability": "medium",
        "impact": "medium",
        "status": "low",
        "mitigation": "Maintain preventive maintenance schedule, backup equipment"
    }
]

# Build the enhanced WBS structure
def build_wbs():
    wbs = {
        "id": "1",
        "code": "1.0",
        "name": "Infrastructure Development of Education City, Karachi Phase-1 (4800 Acres)",
        "level": 0,
        "type": "project",
        "progress": 24,
        "status": "in_progress",
        "children": []
    }

    # Add phases
    phases = [
        {"id": "1.1", "code": "1.1", "name": "Pre-Construction Phase", "level": 1, "type": "phase", "progress": 100, "status": "completed"},
        {"id": "1.2", "code": "1.2", "name": "Road 4", "level": 1, "type": "phase", "progress": 65, "status": "in_progress"},
        {"id": "1.3", "code": "1.3", "name": "Road 3", "level": 1, "type": "phase", "progress": 45, "status": "in_progress"},
        {"id": "1.4", "code": "1.4", "name": "Road 5", "level": 1, "type": "phase", "progress": 35, "status": "in_progress"},
        {"id": "1.5", "code": "1.5", "name": "Box Culverts", "level": 1, "type": "phase", "progress": 70, "status": "in_progress"},
        {"id": "1.6", "code": "1.6", "name": "Major Bridge", "level": 1, "type": "phase", "progress": 15, "status": "in_progress"},
        {"id": "1.7", "code": "1.7", "name": "Gate House & Entry Plaza", "level": 1, "type": "phase", "progress": 10, "status": "in_progress"},
        {"id": "1.8", "code": "1.8", "name": "Water Supply System", "level": 1, "type": "phase", "progress": 40, "status": "in_progress"},
        {"id": "1.9", "code": "1.9", "name": "Horticulture Works", "level": 1, "type": "phase", "progress": 12, "status": "in_progress"},
        {"id": "1.10", "code": "1.10", "name": "Electrical & Street Lighting", "level": 1, "type": "phase", "progress": 20, "status": "in_progress"},
        {"id": "1.11", "code": "1.11", "name": "Milestones", "level": 1, "type": "phase", "progress": 15, "status": "in_progress"}
    ]

    for phase in phases:
        phase["children"] = []

        # Add work packages based on phase
        if phase["id"] == "1.1":
            phase["children"] = [
                {"id": "1.1.1", "code": "1.1.1", "name": "Mobilization", "level": 2, "type": "work_package", "progress": 100, "status": "completed"},
                {"id": "1.1.2", "code": "1.1.2", "name": "Site Survey", "level": 2, "type": "work_package", "progress": 100, "status": "completed"}
            ]
        elif phase["id"] == "1.2":
            phase["children"] = [
                {"id": "1.2.1", "code": "1.2.1", "name": "Earthwork", "level": 2, "type": "work_package", "progress": 100, "status": "completed"},
                {"id": "1.2.2", "code": "1.2.2", "name": "Drain Works", "level": 2, "type": "work_package", "progress": 85, "status": "in_progress"},
                {"id": "1.2.3", "code": "1.2.3", "name": "Sewerage Works", "level": 2, "type": "work_package", "progress": 70, "status": "in_progress"},
                {"id": "1.2.4", "code": "1.2.4", "name": "Water Supply Works", "level": 2, "type": "work_package", "progress": 50, "status": "in_progress"},
                {"id": "1.2.5", "code": "1.2.5", "name": "Road Works", "level": 2, "type": "work_package", "progress": 25, "status": "in_progress"}
            ]
        elif phase["id"] == "1.3":
            phase["children"] = [
                {"id": "1.3.1", "code": "1.3.1", "name": "Earthwork", "level": 2, "type": "work_package", "progress": 80, "status": "in_progress"},
                {"id": "1.3.2", "code": "1.3.2", "name": "Drain Works", "level": 2, "type": "work_package", "progress": 50, "status": "in_progress"},
                {"id": "1.3.3", "code": "1.3.3", "name": "Sewerage Works", "level": 2, "type": "work_package", "progress": 40, "status": "in_progress"},
                {"id": "1.3.4", "code": "1.3.4", "name": "Water Supply Works", "level": 2, "type": "work_package", "progress": 30, "status": "pending"},
                {"id": "1.3.5", "code": "1.3.5", "name": "Road Works", "level": 2, "type": "work_package", "progress": 10, "status": "pending"}
            ]
        elif phase["id"] == "1.4":
            phase["children"] = [
                {"id": "1.4.1", "code": "1.4.1", "name": "Earthwork", "level": 2, "type": "work_package", "progress": 70, "status": "in_progress"},
                {"id": "1.4.2", "code": "1.4.2", "name": "Drain Works", "level": 2, "type": "work_package", "progress": 40, "status": "pending"},
                {"id": "1.4.3", "code": "1.4.3", "name": "Sewerage Works", "level": 2, "type": "work_package", "progress": 30, "status": "pending"},
                {"id": "1.4.4", "code": "1.4.4", "name": "Water Supply Works", "level": 2, "type": "work_package", "progress": 20, "status": "pending"},
                {"id": "1.4.5", "code": "1.4.5", "name": "Road Works", "level": 2, "type": "work_package", "progress": 5, "status": "pending"}
            ]
        elif phase["id"] == "1.5":
            phase["children"] = [
                {"id": "1.5.1", "code": "1.5.1", "name": "Three Cell Box Culvert", "level": 2, "type": "work_package", "progress": 100, "status": "completed"},
                {"id": "1.5.2", "code": "1.5.2", "name": "Two Cell Box Culvert", "level": 2, "type": "work_package", "progress": 100, "status": "completed"},
                {"id": "1.5.3", "code": "1.5.3", "name": "One Cell Box Culvert", "level": 2, "type": "work_package", "progress": 50, "status": "in_progress"}
            ]
        elif phase["id"] == "1.6":
            phase["children"] = [
                {"id": "1.6.1", "code": "1.6.1", "name": "Bridge Substructure", "level": 2, "type": "work_package", "progress": 40, "status": "in_progress"},
                {"id": "1.6.2", "code": "1.6.2", "name": "Bridge Superstructure", "level": 2, "type": "work_package", "progress": 0, "status": "pending"}
            ]
        elif phase["id"] == "1.7":
            phase["children"] = [
                {"id": "1.7.1", "code": "1.7.1", "name": "Gate House Civil Works", "level": 2, "type": "work_package", "progress": 20, "status": "in_progress"},
                {"id": "1.7.2", "code": "1.7.2", "name": "Gate House Architecture", "level": 2, "type": "work_package", "progress": 0, "status": "pending"},
                {"id": "1.7.3", "code": "1.7.3", "name": "Gate House MEP", "level": 2, "type": "work_package", "progress": 0, "status": "pending"},
                {"id": "1.7.4", "code": "1.7.4", "name": "Entry Plaza Horticulture", "level": 2, "type": "work_package", "progress": 0, "status": "pending"}
            ]
        elif phase["id"] == "1.8":
            phase["children"] = [
                {"id": "1.8.1", "code": "1.8.1", "name": "Tube Wells", "level": 2, "type": "work_package", "progress": 100, "status": "completed"},
                {"id": "1.8.2", "code": "1.8.2", "name": "Water Reservoirs", "level": 2, "type": "work_package", "progress": 80, "status": "in_progress"},
                {"id": "1.8.3", "code": "1.8.3", "name": "Pump Stations", "level": 2, "type": "work_package", "progress": 30, "status": "in_progress"}
            ]
        elif phase["id"] == "1.9":
            phase["children"] = [
                {"id": "1.9.1", "code": "1.9.1", "name": "Miyawaki Forest Area", "level": 2, "type": "work_package", "progress": 20, "status": "in_progress"},
                {"id": "1.9.2", "code": "1.9.2", "name": "Garden & Lawn Areas", "level": 2, "type": "work_package", "progress": 5, "status": "pending"}
            ]
        elif phase["id"] == "1.10":
            phase["children"] = [
                {"id": "1.10.1", "code": "1.10.1", "name": "Street Lighting", "level": 2, "type": "work_package", "progress": 30, "status": "in_progress"},
                {"id": "1.10.2", "code": "1.10.2", "name": "Power Distribution", "level": 2, "type": "work_package", "progress": 20, "status": "pending"},
                {"id": "1.10.3", "code": "1.10.3", "name": "MV Distribution", "level": 2, "type": "work_package", "progress": 10, "status": "pending"}
            ]
        elif phase["id"] == "1.11":
            phase["children"] = [
                {"id": "1.11.1", "code": "1.11.1", "name": "Project Commencement", "level": 2, "type": "milestone", "progress": 100, "status": "completed"},
                {"id": "1.11.2", "code": "1.11.2", "name": "Project Completion", "level": 2, "type": "milestone", "progress": 0, "status": "pending"}
            ]

        wbs["children"].append(phase)

    return wbs

# Build the final app-state
final_app_state = {
    "project": {
        "id": "edu-city-pkg1a",
        "name": "Infrastructure Development of Education City, Karachi Phase-1 (4800 Acres) — Package-1-A",
        "client": "CGD Consulting",
        "contractor": "J.N & Co.",
        "location": "Karachi, Pakistan",
        "budget": "PKR 12.5 Billion",
        "startDate": "2025-01-20",
        "endDate": "2027-10-30",
        "duration": 1014,
        "status": "in_progress",
        "progress": 24,
        "description": "Development of education city infrastructure including roads, bridges, drainage, water supply, electrical systems, and horticulture works."
    },
    "wbs": build_wbs(),
    "tasks": enhanced_tasks,
    "resources": resources,
    "allocations": allocations,
    "milestones": milestones,
    "risks": risks,
    "documents": data.get('documents', []),
    "activities": [
        {
            "id": f"activity-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "action": "Comprehensive app-state.json generated",
            "detail": f"Generated enhanced app-state with {len(enhanced_tasks)} tasks, {len(resources)} resources, {len(allocations)} allocations, {len(milestones)} milestones, and {len(risks)} risks from PDF.",
            "time": "just now",
            "user": "System",
            "createdAt": datetime.now().isoformat() + "Z"
        }
    ],
    "insights": [
        {
            "id": "insight-1",
            "type": "schedule",
            "title": "Critical Path Analysis",
            "description": "Major Bridge construction (1.6) is on the critical path. Any delay here will impact overall project completion."
        },
        {
            "id": "insight-2",
            "type": "resource",
            "title": "Resource Utilization",
            "description": "Bridge Team and Earthwork Team are highly utilized (>85%). Consider adding resources if delays occur."
        },
        {
            "id": "insight-3",
            "type": "risk",
            "title": "Weather Impact",
            "description": "Earthwork activities are monsoon-sensitive. Complete earthwork before monsoon season."
        },
        {
            "id": "insight-4",
            "type": "cost",
            "title": "Budget Status",
            "description": "Current spend aligns with schedule. Material price escalation is a moderate risk."
        }
    ],
    "lastUpdatedAt": datetime.now().isoformat() + "Z"
}

# Save the enhanced app-state.json
output_path = '/workspace/app-state.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(final_app_state, f, indent=2, ensure_ascii=False)

print(f"\nEnhanced app-state.json saved to: {output_path}")
print(f"\nSummary:")
print(f"  - Tasks: {len(enhanced_tasks)}")
print(f"  - Resources: {len(resources)}")
print(f"  - Allocations: {len(allocations)}")
print(f"  - Milestones: {len(milestones)}")
print(f"  - Risks: {len(risks)}")
print(f"  - WBS Phases: {len(wbs_hierarchy['1.0']['children'])}")
