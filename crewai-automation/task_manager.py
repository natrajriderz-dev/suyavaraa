#!/usr/bin/env python3
from dev_test_crew import *
import sys

def main():
    print("🤖 Bond-App Automation Task Manager")
    print("=" * 50)
    print("\nWhat would you like to do?")
    print("1. Develop a new feature")
    print("2. Test existing code")
    print("3. Full automation (develop + test)")
    print("4. Exit")
    
    choice = input("\nEnter choice (1-4): ").strip()
    
    if choice == "1":
        feature = input("Describe the feature: ")
        file = input("Target file (e.g., screens/main/HomeScreen.js): ")
        crew = create_feature_development_crew(feature, file)
        result = crew.kickoff()
        print("\n✅ Result:", result)
        
    elif choice == "2":
        file = input("File to test: ")
        crew = create_testing_crew(file)
        result = crew.kickoff()
        print("\n✅ Result:", result)
        
    elif choice == "3":
        feature = input("Describe the feature: ")
        file = input("Target file: ")
        crew = create_full_automation_crew(feature, file)
        result = crew.kickoff()
        print("\n✅ Result:", result)
        
    elif choice == "4":
        print("Goodbye! 👋")
        sys.exit(0)
    else:
        print("Invalid choice!")

if __name__ == "__main__":
    main()
