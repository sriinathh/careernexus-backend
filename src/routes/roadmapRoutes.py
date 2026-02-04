"""
Career Roadmap API Endpoint

Flask endpoint to generate personalized career roadmaps based on
career guidance analysis. Uses rule-based logic to create skill-gap-driven,
phase-based actionable roadmaps.

Supports 3 execution paths:
- Internship: Suitable for students/freshers
- Placement: Direct job search path  
- Higher Studies: Masters/further education path
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import json

# Create Blueprint for career routes
roadmap_bp = Blueprint('roadmap', __name__, url_prefix='/api/career')

# ============================================================================
# ROADMAP DATA GENERATORS
# ============================================================================

def generate_skill_gap_tasks(career, missing_skills, strength_skills, experience_level):
    """
    Generate tasks ONLY based on skill gaps and weaknesses.
    No generic steps - everything must address an actual gap.
    
    Args:
        career: Primary career role (e.g., "Data Analyst")
        missing_skills: List of skills student doesn't have
        strength_skills: List of skills student has
        experience_level: Student/Fresher/Professional
        
    Returns:
        List of tasks with IDs, descriptions, priorities, and reasons
    """
    
    tasks = []
    
    # HIGH PRIORITY: Master each missing skill with specific task
    for skill in missing_skills:
        skill_task = {
            'id': f"skill-{skill.lower().replace(' ', '-')}",
            'title': f'Master {skill} for {career}',
            'description': f'Complete comprehensive training in {skill}. Build 2-3 projects demonstrating {skill} expertise.',
            'priority': 'High',
            'reason': f'{skill} is a critical gap. {career} roles heavily require {skill}. Missing this skill reduces offers by 40%+.',
            'impact': f'Resume score +10-15%. Direct match with 70%+ job postings for {career}.',
            'metric': 'resume',
            'estimatedDays': 21,
            'resources': ['Online courses (Udemy/Coursera)', 'Practice projects', 'Kaggle datasets'],
            'xpReward': 300,
            'status': 'pending',
            'locked': False
        }
        tasks.append(skill_task)
    
    # HIGH PRIORITY: Portfolio projects (proves capability)
    tasks.append({
        'id': 'portfolio-projects',
        'title': f'Build {career} Portfolio: 2-3 End-to-End Projects',
        'description': f'Create tangible projects showcasing {career} skills. Examples: Real dataset analysis, predictive model, business dashboard, etc.',
        'priority': 'High',
        'reason': 'Portfolio projects are THE strongest signal. Transforms resume from "talks about" to "has proven". Employers hire based on portfolio.',
        'impact': 'Resume score +20%. Portfolio adds credibility that beats degree. Interview discussions become deep and confident.',
        'metric': 'resume',
        'estimatedDays': 28,
        'resources': ['GitHub for hosting', 'Kaggle/data.gov for datasets', 'Medium/Hashnode for documentation'],
        'xpReward': 500,
        'status': 'pending',
        'locked': False
    })
    
    # HIGH PRIORITY: Resume optimization
    tasks.append({
        'id': 'resume-optimization',
        'title': 'Optimize Resume: Keywords + Achievements + Projects',
        'description': f'Rewrite resume with ATS keywords for {career}, quantified achievements, and project outcomes. Target: Pass ATS filters + catch recruiter eye.',
        'priority': 'High',
        'reason': 'Resume is gatekeeper. 75% of resumes don\'t pass ATS. Keywords directly = interviews.',
        'impact': 'Resume passes ATS filters. Interview callbacks increase 300-400%.',
        'metric': 'resume',
        'estimatedDays': 5,
        'resources': ['Job postings for keyword analysis', 'Resume templates', 'ATS checkers'],
        'xpReward': 200,
        'status': 'pending',
        'locked': False
    })
    
    # MEDIUM PRIORITY: Interview preparation
    tasks.append({
        'id': 'interview-preparation',
        'title': f'{career} Technical + Behavioral Interview Prep',
        'description': 'Master technical questions, case studies, and behavioral responses. Practice with mock interviews.',
        'priority': 'High',
        'reason': 'Interviews determine job offers. Having skills isn\'t enough - must communicate them clearly.',
        'impact': 'Interview readiness: High. Success rate in interviews increases by 60%+.',
        'metric': 'interview',
        'estimatedDays': 21,
        'resources': ['LeetCode/HackerRank', 'STAR method guides', 'Mock interview platforms'],
        'xpReward': 400,
        'status': 'pending',
        'locked': False
    })
    
    return tasks


def organize_into_phases(tasks, career, path, experience_level, readiness_score):
    """
    Organize tasks into 4 career phases, each with clear purpose.
    Phases are sequential - later phases lock until earlier ones progress.
    
    Phases:
    1. Foundation - Learn missing skills
    2. Portfolio - Build projects
    3. Industry Readiness - Prepare for applications/internships
    4. Execution - Execute the chosen path
    """
    
    phases = []
    
    # PHASE 1: FOUNDATION (Learn core skills)
    foundation_tasks = [t for t in tasks if t['metric'] == 'resume' and t['priority'] == 'High'][:4]
    phases.append({
        'id': 'foundation',
        'name': '📚 Foundation Phase',
        'number': 1,
        'duration': '4-6 weeks',
        'description': 'Master core skills and knowledge gaps identified in career analysis.',
        'icon': '📚',
        'color': '#4F46E5',
        'tasks': foundation_tasks,
        'completedTasks': 0,
        'locked': False,
        'unlockAt': 'Start immediately',
        'progressPercent': 0
    })
    
    # PHASE 2: PORTFOLIO (Build projects)
    portfolio_task = [t for t in tasks if t['id'] == 'portfolio-projects']
    resume_task = [t for t in tasks if t['id'] == 'resume-optimization']
    
    phases.append({
        'id': 'portfolio',
        'name': '🎯 Portfolio Phase',
        'number': 2,
        'duration': '3-4 weeks',
        'description': 'Build real-world projects and optimize resume. Create tangible proof of skills.',
        'icon': '🎯',
        'color': '#06B6D4',
        'tasks': portfolio_task + resume_task,
        'completedTasks': 0,
        'locked': True,
        'unlockAt': 'Unlock after Foundation Phase (50% completion)',
        'progressPercent': 0,
        'lockReason': 'Foundation skills must be learned first'
    })
    
    # PHASE 3: INDUSTRY READINESS
    industry_tasks = [t for t in tasks if t['id'] == 'interview-preparation']
    
    # Add path-specific task
    if path == 'internship' and experience_level in ['Student', 'Fresher']:
        industry_tasks.insert(0, {
            'id': 'internship-applications',
            'title': f'Apply to {career} Internships',
            'description': f'Target internships at FAANG, startups, and tier-1 companies. Apply to 15-20 positions.',
            'priority': 'High',
            'reason': 'Internship bridges academics to jobs. 60% of interns get converted to full-time offers.',
            'impact': 'Readiness score +25%. Real-world experience begins.',
            'metric': 'readiness',
            'estimatedDays': 30,
            'resources': ['Internshala', 'LinkedIn', 'Company career pages'],
            'xpReward': 1000,
            'status': 'pending',
            'locked': True
        })
    
    phases.append({
        'id': 'industry',
        'name': '🚀 Industry Readiness',
        'number': 3,
        'duration': '4-6 weeks',
        'description': 'Prepare for opportunities. Master interviews. Polish applications.',
        'icon': '🚀',
        'color': '#EC4899',
        'tasks': industry_tasks,
        'completedTasks': 0,
        'locked': True,
        'unlockAt': 'Unlock after Portfolio Phase (70% completion)',
        'progressPercent': 0,
        'lockReason': 'Portfolio must be strong first'
    })
    
    # PHASE 4: EXECUTION (Path-specific)
    if path == 'internship':
        execution_title = '💼 Internship Execution Phase'
        execution_desc = 'Land internship, excel in role, gain real experience, and transition to placement.'
        execution_icon = '💼'
    elif path == 'placement':
        execution_title = '💼 Placement Execution Phase'
        execution_desc = 'Execute job applications across companies, interview rounds, and secure offer.'
        execution_icon = '💼'
    else:  # higher studies
        execution_title = '🎓 Higher Studies Phase'
        execution_desc = 'Prepare for Masters admission. Achieve competitive test scores. Build strong profile.'
        execution_icon = '🎓'
    
    phases.append({
        'id': 'execution',
        'name': execution_title,
        'number': 4,
        'duration': '8-12 weeks',
        'description': execution_desc,
        'icon': execution_icon,
        'color': '#10B981',
        'tasks': [{
            'id': 'path-execution',
            'title': f'Execute {path.capitalize()} Path',
            'description': f'Execute applications, interviews, and secure {path} opportunity.',
            'priority': 'High',
            'reason': f'This is the final phase where all preparation becomes reality.',
            'impact': f'Achieves goal: {path}.',
            'metric': 'readiness',
            'estimatedDays': 90 if path == 'placement' else 60,
            'resources': [],
            'xpReward': 2000,
            'status': 'pending',
            'locked': True
        }],
        'completedTasks': 0,
        'locked': True,
        'unlockAt': 'Unlock after Industry Readiness (70% completion)',
        'progressPercent': 0,
        'lockReason': 'Previous phases must be substantially complete'
    })
    
    return phases


def calculate_health_status(readiness_score, confidence_score, completed_tasks, total_tasks):
    """
    Calculate roadmap health indicator based on:
    - Career readiness score
    - Confidence level
    - Task completion rate
    """
    
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Determine status
    if readiness_score >= 70 and confidence_score >= 75 and completion_rate > 60:
        status = 'on-track'
        reason = '✅ Excellent progress! Keep the momentum going.'
    elif readiness_score >= 50 and confidence_score >= 60 and completion_rate > 30:
        status = 'on-track'
        reason = '✅ On track. Consistency is key - maintain weekly progress.'
    elif readiness_score >= 40 or completion_rate > 15:
        status = 'needs-attention'
        reason = '⚠️ Some gaps. Focus on high-priority tasks in Foundation phase.'
    else:
        status = 'off-track'
        reason = '🔴 Needs immediate action. Start Foundation phase tasks today.'
    
    return {
        'status': status,
        'completionRate': round(completion_rate, 1),
        'readinessScore': readiness_score,
        'confidenceScore': confidence_score,
        'reason': reason
    }


def calculate_impact_preview(missing_skills_count, resume_score, readiness_score):
    """
    Calculate expected improvements if roadmap is completed.
    Shows impact preview to motivate execution.
    """
    
    # Estimate improvements based on skill gaps
    resume_improvement = min(25, missing_skills_count * 4 + 5)
    readiness_improvement = min(30, 15 + (missing_skills_count * 3))
    
    return {
        'currentResumeScore': resume_score,
        'estimatedResumeScore': min(100, resume_score + resume_improvement),
        'resumeImprovement': f'+{resume_improvement}%',
        'currentReadinessScore': readiness_score,
        'estimatedReadinessScore': min(100, readiness_score + readiness_improvement),
        'readinessImprovement': f'+{readiness_improvement}%',
        'interviewReadiness': 'High',
        'opportunityReadiness': 'High',
        'completionTimeWeeks': max(12, 8 + (missing_skills_count * 1)),
        'successProbability': '85-95%'
    }


# ============================================================================
# API ENDPOINTS
# ============================================================================

@roadmap_bp.route('/roadmap', methods=['GET'])
def get_roadmap():
    """
    GET /api/career/roadmap
    
    Generate personalized career roadmap based on career guidance analysis.
    
    Query Parameters:
    - path: 'internship', 'placement', or 'studies' (default: 'placement')
    - careerData: Pre-computed career analysis (if available)
    
    Returns:
    {
        career: string,
        confidence: number,
        path: string,
        phases: array,
        health: object,
        impactPreview: object,
        totalXP: number,
        completedTasks: number,
        totalTasks: number
    }
    """
    
    try:
        # Get path from query parameter
        path = request.args.get('path', 'placement').lower()
        
        # Validate path
        if path not in ['internship', 'placement', 'studies']:
            path = 'placement'
        
        # TODO: In production, fetch from session/database
        # For now, use sample career analysis
        career_data = {
            'primaryCareer': 'Data Analyst',
            'confidence': 82,
            'resumeScore': 65,
            'readinessScore': 58,
            'strengthSkills': ['Python', 'SQL', 'Basic Excel'],
            'missingSkills': ['Power BI', 'Advanced Excel', 'Tableau'],
            'experienceLevel': 'Fresher'
        }
        
        # Generate skill-gap driven tasks
        tasks = generate_skill_gap_tasks(
            career_data['primaryCareer'],
            career_data['missingSkills'],
            career_data['strengthSkills'],
            career_data['experienceLevel']
        )
        
        # Organize into phases
        phases = organize_into_phases(
            tasks,
            career_data['primaryCareer'],
            path,
            career_data['experienceLevel'],
            career_data['readinessScore']
        )
        
        # Calculate health
        total_tasks = sum(len(phase['tasks']) for phase in phases)
        health = calculate_health_status(
            career_data['readinessScore'],
            career_data['confidence'],
            0,  # completed_tasks
            total_tasks
        )
        
        # Calculate impact preview
        impact = calculate_impact_preview(
            len(career_data['missingSkills']),
            career_data['resumeScore'],
            career_data['readinessScore']
        )
        
        # Build response
        roadmap = {
            'career': career_data['primaryCareer'],
            'confidence': career_data['confidence'],
            'path': path,
            'experienceLevel': career_data['experienceLevel'],
            'phases': phases,
            'health': health,
            'impactPreview': impact,
            'stats': {
                'totalTasks': total_tasks,
                'completedTasks': 0,
                'totalXP': sum(t['xpReward'] for phase in phases for t in phase['tasks']),
                'currentXP': 0,
                'completionPercent': 0
            },
            'generatedAt': datetime.now().isoformat(),
            'roadmapVersion': '1.0'
        }
        
        return jsonify(roadmap), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@roadmap_bp.route('/roadmap/task/<task_id>/complete', methods=['POST'])
def complete_task(task_id):
    """
    POST /api/career/roadmap/task/{taskId}/complete
    
    Mark a task as completed. Updates:
    - Task status
    - Career XP
    - Readiness score
    - Phase progression
    
    Returns updated roadmap with new scores.
    """
    
    try:
        # TODO: In production, fetch user's actual roadmap
        # TODO: Update database with completion
        # TODO: Trigger score recalculation
        
        return jsonify({
            'success': True,
            'message': f'Task {task_id} marked complete',
            'xpGained': 200,  # Example
            'newReadinessScore': 65
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@roadmap_bp.route('/roadmap/export/pdf', methods=['GET'])
def export_roadmap_pdf():
    """
    GET /api/career/roadmap/export/pdf
    
    Generate and download roadmap as PDF.
    Includes: Career role, phases, tasks, deadlines, resources.
    
    Returns: PDF file
    """
    
    try:
        # TODO: Generate PDF using reportlab or WeasyPrint
        # TODO: Include roadmap, timeline, resources
        
        return jsonify({
            'message': 'PDF export feature coming soon'
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# HELPER FUNCTION: Register blueprint
# ============================================================================

def register_roadmap_routes(app):
    """Register roadmap blueprint with Flask app"""
    app.register_blueprint(roadmap_bp)
