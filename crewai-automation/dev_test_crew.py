from crewai import Agent, Task, Crew, Process, LLM
from crewai_tools import FileReadTool, DirectoryReadTool, FileWriterTool
import os
from dotenv import load_dotenv

load_dotenv()

# Configure LLM
llm = LLM(
    model="deepseek/deepseek-chat",
    api_key=os.getenv("DEEPSEEK_API_KEY")
)

# Initialize tools
file_reader = FileReadTool()
directory_reader = DirectoryReadTool()
file_writer = FileWriterTool()

# =======================
# DEVELOPMENT AGENTS
# =======================

feature_developer = Agent(
    role='Feature Developer',
    goal='Implement new features and improvements for bond-app',
    backstory='''Expert React Native developer with deep knowledge of Supabase, 
    state management, and mobile UI. Specializes in matrimony and dating app features.''',
    verbose=True,
    llm=llm,
    tools=[file_reader, directory_reader, file_writer],
    allow_delegation=True
)

code_reviewer = Agent(
    role='Code Reviewer',
    goal='Review code for quality, performance, and best practices',
    backstory='''Senior developer with 10+ years experience. Expert in React Native 
    performance optimization, security, and code quality standards.''',
    verbose=True,
    llm=llm,
    tools=[file_reader],
    allow_delegation=False
)

refactoring_specialist = Agent(
    role='Refactoring Specialist',
    goal='Improve code structure and eliminate technical debt',
    backstory='''Code architecture expert who optimizes component structure, 
    reduces duplication, and improves maintainability.''',
    verbose=True,
    llm=llm,
    tools=[file_reader, file_writer],
    allow_delegation=False
)

# =======================
# TESTING AGENTS
# =======================

test_engineer = Agent(
    role='Test Engineer',
    goal='Create comprehensive test suites for all features',
    backstory='''QA expert specializing in React Native testing with Jest, 
    React Testing Library, and E2E testing frameworks.''',
    verbose=True,
    llm=llm,
    tools=[file_reader, file_writer],
    allow_delegation=False
)

bug_hunter = Agent(
    role='Bug Hunter',
    goal='Find and document bugs, edge cases, and potential issues',
    backstory='''Meticulous QA specialist who thinks like a user and finds 
    bugs others miss. Expert in edge case analysis.''',
    verbose=True,
    llm=llm,
    tools=[file_reader],
    allow_delegation=False
)

integration_tester = Agent(
    role='Integration Tester',
    goal='Test Supabase integration and API connections',
    backstory='''Backend integration expert who ensures all database operations, 
    real-time features, and API calls work flawlessly.''',
    verbose=True,
    llm=llm,
    tools=[file_reader, file_writer],
    allow_delegation=False
)

# =======================
# HELPER FUNCTIONS
# =======================

def create_feature_development_crew(feature_description, target_file):
    """Create a crew to develop a new feature"""
    
    develop_task = Task(
        description=f'''
        Develop the following feature: {feature_description}
        Target file: {target_file}
        
        Requirements:
        1. Read the current code structure
        2. Implement the feature following existing patterns
        3. Ensure ModeContext integration (Dating vs Matrimony)
        4. Use proper error handling
        5. Follow React Native best practices
        6. Write clean, documented code
        ''',
        agent=feature_developer,
        expected_output='Complete code implementation with comments'
    )
    
    review_task = Task(
        description=f'''
        Review the implemented feature in {target_file}
        
        Check for:
        1. Code quality and readability
        2. Performance implications
        3. Potential bugs or edge cases
        4. Security concerns
        5. Adherence to project patterns
        
        Provide specific improvement suggestions.
        ''',
        agent=code_reviewer,
        expected_output='Detailed code review with actionable feedback',
        context=[develop_task]
    )
    
    refactor_task = Task(
        description='''
        Based on the review feedback, refactor the code if needed.
        
        Focus on:
        1. Performance optimization
        2. Code clarity
        3. Removing duplication
        4. Improving structure
        ''',
        agent=refactoring_specialist,
        expected_output='Optimized, production-ready code',
        context=[develop_task, review_task]
    )
    
    crew = Crew(
        agents=[feature_developer, code_reviewer, refactoring_specialist],
        tasks=[develop_task, review_task, refactor_task],
        process=Process.sequential,
        verbose=True
    )
    
    return crew


def create_testing_crew(file_to_test):
    """Create a crew to test a specific file or feature"""
    
    analyze_task = Task(
        description=f'''
        Analyze {file_to_test} and identify all testable scenarios.
        
        Include:
        1. Component rendering tests
        2. User interaction tests
        3. Edge cases
        4. Error scenarios
        5. Integration points
        ''',
        agent=bug_hunter,
        expected_output='Comprehensive list of test scenarios'
    )
    
    write_tests_task = Task(
        description=f'''
        Write Jest tests for {file_to_test}
        
        Create tests for:
        1. All scenarios identified
        2. Component snapshots
        3. User interactions
        4. State changes
        5. Error handling
        
        Use React Testing Library and Jest best practices.
        ''',
        agent=test_engineer,
        expected_output='Complete test file with all test cases',
        context=[analyze_task]
    )
    
    integration_test_task = Task(
        description=f'''
        Create integration tests for {file_to_test}
        
        Test:
        1. Supabase database operations
        2. Real-time subscriptions
        3. API calls
        4. Data flow
        5. Error recovery
        ''',
        agent=integration_tester,
        expected_output='Integration test suite',
        context=[analyze_task]
    )
    
    crew = Crew(
        agents=[bug_hunter, test_engineer, integration_tester],
        tasks=[analyze_task, write_tests_task, integration_test_task],
        process=Process.sequential,
        verbose=True
    )
    
    return crew


def create_full_automation_crew(feature_description, target_file):
    """Complete automation: develop + review + test"""
    
    # Development tasks
    develop_task = Task(
        description=f'Develop feature: {feature_description} in {target_file}',
        agent=feature_developer,
        expected_output='Complete implementation'
    )
    
    review_task = Task(
        description=f'Review the implementation in {target_file}',
        agent=code_reviewer,
        expected_output='Code review report',
        context=[develop_task]
    )
    
    refactor_task = Task(
        description='Refactor based on review feedback',
        agent=refactoring_specialist,
        expected_output='Optimized code',
        context=[develop_task, review_task]
    )
    
    # Testing tasks
    test_analysis_task = Task(
        description='Identify all test scenarios',
        agent=bug_hunter,
        expected_output='Test scenario list',
        context=[refactor_task]
    )
    
    write_tests_task = Task(
        description='Write comprehensive tests',
        agent=test_engineer,
        expected_output='Complete test suite',
        context=[refactor_task, test_analysis_task]
    )
    
    integration_test_task = Task(
        description='Create integration tests',
        agent=integration_tester,
        expected_output='Integration tests',
        context=[refactor_task, test_analysis_task]
    )
    
    crew = Crew(
        agents=[
            feature_developer, 
            code_reviewer, 
            refactoring_specialist,
            bug_hunter, 
            test_engineer, 
            integration_tester
        ],
        tasks=[
            develop_task, 
            review_task, 
            refactor_task,
            test_analysis_task, 
            write_tests_task, 
            integration_test_task
        ],
        process=Process.sequential,
        verbose=True
    )
    
    return crew


# =======================
# MAIN EXECUTION
# =======================

if __name__ == "__main__":
    print("🤖 Bond-App Development & Testing Automation")
    print("=" * 50)
    
    # Example 1: Develop a feature
    print("\n📝 Option 1: Feature Development Only")
    print("Example: crew = create_feature_development_crew('Add filter by religion', 'screens/SearchScreen.js')")
    
    # Example 2: Test existing code
    print("\n🧪 Option 2: Testing Only")
    print("Example: crew = create_testing_crew('screens/main/HomeScreen.js')")
    
    # Example 3: Full automation
    print("\n🚀 Option 3: Full Automation (Develop + Test)")
    print("Example: crew = create_full_automation_crew('Add advanced search filters', 'screens/SearchScreen.js')")
    
    print("\n" + "=" * 50)
    print("Ready to use! Import this file and call the functions.")
