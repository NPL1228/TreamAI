import sqlite3

DB_PATH = "fyp.db"

def view_table(table_name):
    print(f"\n--- Table: {table_name} ---")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get column names
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [info[1] for info in cursor.fetchall()]
        print(" | ".join(columns))
        print("-" * 50)
        
        # Get all rows
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        for row in rows:
            print(" | ".join([str(val) for val in row]))
            
        if not rows:
            print("(Empty)")
            
    except Exception as e:
        print(f"Error reading table: {e}")
        
    conn.close()

if __name__ == "__main__":
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Fetch all table names dynamically
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    for t in tables:
        view_table(t)
