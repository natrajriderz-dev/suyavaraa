from dev_test_crew import create_full_automation_crew

# Configure your task
FEATURE = "Add advanced filtering with age range, location, and profession filters"
TARGET_FILE = "screens/SearchScreen.js"

print(f"🤖 Full Automation Starting...")
print(f"📝 Feature: {FEATURE}")
print(f"📁 File: {TARGET_FILE}\n")

crew = create_full_automation_crew(FEATURE, TARGET_FILE)
result = crew.kickoff()

print("\n✅ Automation Complete!")
print("=" * 50)
print(result)
