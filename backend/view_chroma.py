import chromadb

def view_chroma():
    client = chromadb.PersistentClient(path="./chroma_db")
    
    # List all collections
    collections = client.list_collections()
    if not collections:
        print("No ChromaDB collections found yet.")
        return
        
    print(f"Found {len(collections)} collections.")
    
    for coll in collections:
        # Chroma API returns strings in newer versions, and objects in older versions
        coll_name = coll if isinstance(coll, str) else coll.name
        print(f"\n--- Collection: {coll_name} ---")
        try:
            collection = client.get_collection(coll_name)
            # Fetch all items in the collection
            data = collection.get()
            
            ids = data.get("ids", [])
            documents = data.get("documents", [])
            metadatas = data.get("metadatas", [])
            
            print(f"Total Nodes: {len(ids)}\n")
            
            for i in range(len(ids)):
                print(f"ID: {ids[i]}")
                print(f"Metadata: {metadatas[i]}")
                print(f"Content: {documents[i]}")
                print("-" * 30)
                
        except Exception as e:
            print(f"Could not read collection {coll.name}: {e}")

if __name__ == "__main__":
    view_chroma()
