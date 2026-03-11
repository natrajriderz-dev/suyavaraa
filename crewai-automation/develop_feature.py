from dev_test_crew import create_feature_development_crew

# Configure your feature here
FEATURE = "Refine MatrimonyCard UI with glassmorphism and premium styling"
TARGET_FILE = "screens/main/HomeScreen.js"

print(f"🚀 Developing: {FEATURE}")
print(f"📁 Target: {TARGET_FILE}\n")

crew = create_feature_development_crew(FEATURE, TARGET_FILE)
result = crew.kickoff()

print("\n✅ Development Complete!")
print("=" * 50)
print(result)
