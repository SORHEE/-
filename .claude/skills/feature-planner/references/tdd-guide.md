# Test Specification Guidelines

## Test-First Development Workflow

**For Each Feature Component**:
1. **Specify Test Cases** (before writing ANY code)
   - What inputs will be tested?
   - What outputs are expected?
   - What edge cases must be handled?
   - What error conditions should be tested?

2. **Write Tests** (Red Phase)
   - Write tests that WILL fail
   - Verify tests fail for the right reason
   - Run tests to confirm failure
   - Commit failing tests to track TDD compliance

3. **Implement Code** (Green Phase)
   - Write minimal code to make tests pass
   - Run tests frequently (every 2-5 minutes)
   - Stop when all tests pass
   - No additional functionality beyond tests

4. **Refactor** (Blue Phase)
   - Improve code quality while tests remain green
   - Extract duplicated logic
   - Improve naming and structure
   - Run tests after each refactoring step
   - Commit when refactoring complete

## Test Types

**Unit Tests**:
- **Target**: Individual functions, methods, classes
- **Dependencies**: None or mocked/stubbed
- **Speed**: Fast (<100ms per test)
- **Isolation**: Complete isolation from external systems
- **Coverage**: ≥80% of business logic

**Integration Tests**:
- **Target**: Interaction between components/modules
- **Dependencies**: May use real dependencies
- **Speed**: Moderate (<1s per test)
- **Isolation**: Tests component boundaries
- **Coverage**: Critical integration points

**End-to-End (E2E) Tests**:
- **Target**: Complete user workflows
- **Dependencies**: Real or near-real environment
- **Speed**: Slow (seconds to minutes)
- **Isolation**: Full system integration
- **Coverage**: Critical user journeys

## Test Coverage Calculation

**Coverage Thresholds** (adjust for your project):
- **Business Logic**: ≥90% (critical code paths)
- **Data Access Layer**: ��80% (repositories, DAOs)
- **API/Controller Layer**: ≥70% (endpoints)
- **UI/Presentation**: Integration tests preferred over coverage

**Coverage Commands by Ecosystem**:
```bash
# JavaScript/TypeScript
jest --coverage
nyc report --reporter=html

# Python
pytest --cov=src --cov-report=html
coverage report

# Java
mvn jacoco:report
gradle jacocoTestReport

# Go
go test -cover ./...
go tool cover -html=coverage.out

# .NET
dotnet test /p:CollectCoverage=true /p:CoverageReporter=html
reportgenerator -reports:coverage.xml -targetdir:coverage

# Ruby
bundle exec rspec --coverage
open coverage/index.html

# PHP
phpunit --coverage-html coverage
```

## Common Test Patterns

**Arrange-Act-Assert (AAA) Pattern**:
```
test 'description of behavior':
  // Arrange: Set up test data and dependencies
  input = createTestData()

  // Act: Execute the behavior being tested
  result = systemUnderTest.method(input)

  // Assert: Verify expected outcome
  assert result == expectedOutput
```

**Given-When-Then (BDD Style)**:
```
test 'feature should behave in specific way':
  // Given: Initial context/state
  given userIsLoggedIn()

  // When: Action occurs
  when userClicksButton()

  // Then: Observable outcome
  then shouldSeeConfirmation()
```

**Mocking/Stubbing Dependencies**:
```
test 'component should call dependency':
  // Create mock/stub
  mockService = createMock(ExternalService)
  component = new Component(mockService)

  // Configure mock behavior
  when(mockService.method()).thenReturn(expectedData)

  // Execute and verify
  component.execute()
  verify(mockService.method()).calledOnce()
```

## Test Documentation in Plan

**In each phase, specify**:
1. **Test File Location**: Exact path where tests will be written
2. **Test Scenarios**: List of specific test cases
3. **Expected Failures**: What error should tests show initially?
4. **Coverage Target**: Percentage for this phase
5. **Dependencies to Mock**: What needs mocking/stubbing?
6. **Test Data**: What fixtures/factories are needed?
