$ErrorActionPreference = 'Stop'

$profBody = @{ email = 'prof@test.com'; password = 'Pass1234!' } | ConvertTo-Json
$studentBody = @{ email = 'student@test.com'; password = 'Pass1234!' } | ConvertTo-Json
$prof = Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/login -ContentType 'application/json' -Body $profBody
$student = Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/login -ContentType 'application/json' -Body $studentBody
$profHeaders = @{ Authorization = "Bearer $($prof.token)" }
$studentHeaders = @{ Authorization = "Bearer $($student.token)" }
$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

$courseBody = @{ name = "Curso Impl $suffix"; code = "IMPL-$suffix"; period = '2026-1'; group = '1' } | ConvertTo-Json
$course = Invoke-RestMethod -Method Post -Uri http://localhost:3000/courses -Headers $profHeaders -ContentType 'application/json' -Body $courseBody

$enrollBody = @{ studentId = $student.user.id } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/courses/$($course.id)/students" -Headers $profHeaders -ContentType 'application/json' -Body $enrollBody | Out-Null

$challengeBody = @{
  title = "Reto Impl $suffix"
  description = 'Validacion de flujo e2e'
  difficulty = 'Medium'
  tags = @('SELECT', 'ORDER BY')
  databaseEngine = 'PostgreSQL'
  timeLimit = 5000
  courseId = $course.id
} | ConvertTo-Json
$challenge = Invoke-RestMethod -Method Post -Uri http://localhost:3000/challenges -Headers $profHeaders -ContentType 'application/json' -Body $challengeBody

$schemaBody = @{ ddlScript = "CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(100));" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/challenges/$($challenge.id)/schema" -Headers $profHeaders -ContentType 'application/json' -Body $schemaBody | Out-Null

$seedBody = @{ insertScript = "INSERT INTO customers (id, name) VALUES (1, 'Ana'), (2, 'Luis');" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/challenges/$($challenge.id)/seed-data" -Headers $profHeaders -ContentType 'application/json' -Body $seedBody | Out-Null

$expectedBody = @{ query = "SELECT name FROM customers ORDER BY id;"; outputJson = @(@{name='Ana'}, @{name='Luis'}) } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/challenges/$($challenge.id)/expected-result" -Headers $profHeaders -ContentType 'application/json' -Body $expectedBody | Out-Null

$publishBody = @{ status = 'published' } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/challenges/$($challenge.id)/status" -Headers $profHeaders -ContentType 'application/json' -Body $publishBody | Out-Null

$submissionBody = @{ challengeId = $challenge.id; query = 'SELECT name FROM customers ORDER BY id;'; engine = 'postgresql' } | ConvertTo-Json
$submissionOutsideAssessment = Invoke-RestMethod -Method Post -Uri http://localhost:3000/submissions -Headers $studentHeaders -ContentType 'application/json' -Body $submissionBody

$startDate = (Get-Date).AddMinutes(-1).ToString('o')
$endDate = (Get-Date).AddMinutes(30).ToString('o')
$assessmentBody = @{
  name = "Parcial Impl $suffix"
  description = 'Validacion de intento'
  startDate = $startDate
  endDate = $endDate
  duration = 30
  maxAttempts = 3
  visibility = $true
  courseId = $course.id
  challengeIds = @($challenge.id)
} | ConvertTo-Json -Depth 5
$assessment = Invoke-RestMethod -Method Post -Uri http://localhost:3000/assessments -Headers $profHeaders -ContentType 'application/json' -Body $assessmentBody

$blockedWithoutAttempt = $false
$blockedMessage = ''
try {
  Invoke-RestMethod -Method Post -Uri http://localhost:3000/submissions -Headers $studentHeaders -ContentType 'application/json' -Body $submissionBody | Out-Null
} catch {
  $blockedWithoutAttempt = $true
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
    $blockedMessage = $_.ErrorDetails.Message
  } else {
    $blockedMessage = $_.Exception.Message
  }
}

$attempt = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/assessments/$($assessment.id)/attempts" -Headers $studentHeaders

$submissionWithAttemptBody = @{ challengeId = $challenge.id; query = 'SELECT name FROM customers ORDER BY id;'; engine = 'postgresql'; assessmentAttemptId = $attempt.id } | ConvertTo-Json
$submissionWithAttempt = Invoke-RestMethod -Method Post -Uri http://localhost:3000/submissions -Headers $studentHeaders -ContentType 'application/json' -Body $submissionWithAttemptBody

Write-Output "SMOKE_OK:true"
Write-Output "COURSE_ID:$($course.id)"
Write-Output "CHALLENGE_ID:$($challenge.id)"
Write-Output "ASSESSMENT_ID:$($assessment.id)"
Write-Output "OUTSIDE_ASSESSMENT_SUBMISSION_ID:$($submissionOutsideAssessment.id)"
Write-Output "BLOCKED_WITHOUT_ATTEMPT:$blockedWithoutAttempt"
Write-Output "BLOCKED_MESSAGE:$blockedMessage"
Write-Output "ATTEMPT_ID:$($attempt.id)"
Write-Output "WITH_ATTEMPT_SUBMISSION_ID:$($submissionWithAttempt.id)"