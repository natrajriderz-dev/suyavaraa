from dev_test_crew import create_testing_crew

# Configure what to test
FILE_TO_TEST = "screens/main/HomeScreen.js"

print(f"🧪 Testing: {FILE_TO_TEST}\n")

crew = create_testing_crew(FILE_TO_TEST)
result = crew.kickoff()

print("\n✅ Testing Complete!")
print("=" * 50)
print(result)
