"""
Test the fixed validator with the conditional code that was incorrectly flagged
"""
import sys
sys.path.insert(0, 'F:\\GIU\\Semester 7 (Bachelor Thesis)\\pyblocks\\ai_service')

from app.services.solution_validator import validator

# Test the code that was incorrectly flagged
code = """number = 15
if number > 10:
    print("Greater than 10")
else:
    print("Smaller than 10")"""

expected_output = "Greater than 10"
actual_output = "Greater than 10"
required_concepts = ["conditionals", "comparison"]
difficulty = "easy"

print("Testing validator with conditional code...")
print(f"Code:\n{code}\n")
print(f"Expected Output: {expected_output}")
print(f"Actual Output: {actual_output}\n")

result = validator.validate_solution(
    code=code,
    expected_output=expected_output,
    required_concepts=required_concepts,
    difficulty=difficulty,
    actual_output=actual_output
)

print("=" * 60)
print("VALIDATION RESULT:")
print("=" * 60)
print(f"Is Valid: {result.is_valid}")
print(f"Score Multiplier: {result.score_multiplier}")
print(f"Complexity Score: {result.complexity_score}/100")
print(f"Detected Patterns: {result.detected_patterns}")
print(f"Issues: {result.issues if result.issues else 'None'}")
print("=" * 60)

if result.is_valid:
    print("\n✅ SUCCESS: Code is correctly validated as legitimate!")
else:
    print(f"\n❌ FAILED: Code was incorrectly flagged")
    print(f"Issues: {result.issues}")

# Test the ACTUAL cheating case
print("\n\n" + "=" * 60)
print("Testing with ACTUAL cheating (hardcoded)...")
print("=" * 60)

cheating_code = """print("Greater than 10")"""

result2 = validator.validate_solution(
    code=cheating_code,
    expected_output=expected_output,
    required_concepts=required_concepts,
    difficulty=difficulty,
    actual_output=actual_output
)

print(f"\nCheating Code:\n{cheating_code}\n")
print(f"Is Valid: {result2.is_valid}")
print(f"Score Multiplier: {result2.score_multiplier}")
print(f"Detected Patterns: {result2.detected_patterns}")
print(f"Issues: {result2.issues}")

if not result2.is_valid:
    print("\n✅ SUCCESS: Cheating code correctly detected!")
else:
    print("\n❌ FAILED: Cheating code was not detected")
