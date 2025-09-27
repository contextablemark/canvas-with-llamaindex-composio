"""Sales Pitch Evaluation Agent using LlamaIndex."""

from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from llama_index.core.tools import FunctionTool
from llama_index.core.agent import ReActAgent
from llama_index.llms.openai import OpenAI
from llama_index.core.memory import ChatMemoryBuffer
from workflows import Workflow, Context, step
from workflows.events import Event, StartEvent, StopEvent
import json


class SalesPitchCriteria(BaseModel):
    """Schema for sales pitch evaluation criteria."""
    
    problem_solution: bool = Field(
        default=False,
        description="Clearly identifies a real problem or need, presents a compelling solution that addresses the problem, demonstrates genuine value proposition"
    )
    evidence_proof: bool = Field(
        default=False,
        description="Provides credible data, testimonials, or case studies, shows measurable results or outcomes, backs up claims with concrete evidence"
    )
    differentiation: bool = Field(
        default=False,
        description="Explains what makes the solution unique, compares favorably to alternatives, shows competitive advantages"
    )
    target_fit: bool = Field(
        default=False,
        description="Relevant to the audience's specific needs, appropriate for their industry/situation, addresses their decision-making criteria"
    )
    implementation: bool = Field(
        default=False,
        description="Clear on how the solution works, realistic timeline and requirements, addresses potential obstacles or concerns"
    )
    credibility: bool = Field(
        default=False,
        description="Presenter demonstrates expertise and knowledge, professional delivery and materials, honest about limitations or challenges"
    )
    business_case: bool = Field(
        default=False,
        description="Shows return on investment or cost-benefit, pricing is reasonable and justified, financial impact is clear"
    )
    next_steps: bool = Field(
        default=False,
        description="Clear call to action, reasonable follow-up process, makes it easy to move forward"
    )
    
    def get_score_percentage(self) -> float:
        """Calculate the percentage of criteria met."""
        total_criteria = 8
        met_criteria = sum([
            self.problem_solution,
            self.evidence_proof,
            self.differentiation,
            self.target_fit,
            self.implementation,
            self.credibility,
            self.business_case,
            self.next_steps
        ])
        return (met_criteria / total_criteria) * 100
    
    def is_passing(self) -> bool:
        """Check if the pitch meets at least 60% of criteria."""
        return self.get_score_percentage() >= 60.0


class CompanyInfo(BaseModel):
    """Schema for company information input."""
    
    name: str = Field(description="Company name")
    industry: str = Field(description="Industry sector")
    size: str = Field(description="Company size (e.g., startup, SME, enterprise)")
    pain_points: List[str] = Field(default=[], description="Known pain points or challenges")
    decision_makers: List[str] = Field(default=[], description="Key decision makers and their roles")
    budget_range: Optional[str] = Field(default=None, description="Budget range if known")
    current_solutions: List[str] = Field(default=[], description="Current solutions they use")


class ConversationState(BaseModel):
    """State to track conversation and criteria evaluation."""
    
    company_info: CompanyInfo
    criteria: SalesPitchCriteria = Field(default_factory=SalesPitchCriteria)
    conversation_history: List[str] = Field(default=[])
    last_evaluation: Optional[str] = Field(default=None)


class SalesPitchEvaluationEvent(Event):
    """Event for sales pitch evaluation."""
    
    message: str
    evaluation_result: Dict[str, Any]


class SalesPitchAgent:
    """Sales Pitch Evaluation Agent using LlamaIndex."""
    
    def __init__(self, llm: Optional[OpenAI] = None):
        self.llm = llm or OpenAI(model="gpt-4", temperature=0.1)
        self.conversation_states: Dict[str, ConversationState] = {}
        self.agent = self._create_agent()
    
    def _create_update_checklist_tool(self) -> FunctionTool:
        """Create the update_checklist tool."""
        
        def update_checklist(
            conversation_id: str,
            user_message: str,
            company_context: str = ""
        ) -> str:
            """
            Evaluate if the latest message from the user ticks any of the sales pitch criteria
            and update the criteria for that conversation. Returns 'yes' if at least 60% of 
            criteria are met, 'no' if less than 60% criteria are met.
            
            Args:
                conversation_id: Unique identifier for the conversation
                user_message: The latest message from the user to evaluate
                company_context: Additional context about the company (optional)
            
            Returns:
                'yes' if >= 60% criteria met, 'no' if < 60% criteria met
            """
            
            # Get or create conversation state
            if conversation_id not in self.conversation_states:
                return "Error: No conversation found. Please initialize with company information first."
            
            state = self.conversation_states[conversation_id]
            state.conversation_history.append(user_message)
            
            # Create evaluation prompt
            evaluation_prompt = f"""
            You are evaluating a sales pitch message against specific criteria. 
            
            Company Context:
            - Name: {state.company_info.name}
            - Industry: {state.company_info.industry}
            - Size: {state.company_info.size}
            - Pain Points: {', '.join(state.company_info.pain_points)}
            - Decision Makers: {', '.join(state.company_info.decision_makers)}
            - Budget Range: {state.company_info.budget_range or 'Unknown'}
            - Current Solutions: {', '.join(state.company_info.current_solutions)}
            
            Current Criteria Status:
            - Problem & Solution: {'✓' if state.criteria.problem_solution else '✗'}
            - Evidence & Proof: {'✓' if state.criteria.evidence_proof else '✗'}
            - Differentiation: {'✓' if state.criteria.differentiation else '✗'}
            - Target Fit: {'✓' if state.criteria.target_fit else '✗'}
            - Implementation: {'✓' if state.criteria.implementation else '✗'}
            - Credibility: {'✓' if state.criteria.credibility else '✗'}
            - Business Case: {'✓' if state.criteria.business_case else '✗'}
            - Next Steps: {'✓' if state.criteria.next_steps else '✗'}
            
            Latest Message to Evaluate: "{user_message}"
            
            Evaluate this message and determine which criteria it addresses. For each criterion that is addressed in this message, respond with true. Only mark as true if the message clearly and adequately addresses that specific criterion.
            
            Criteria Definitions:
            1. Problem & Solution: Clearly identifies a real problem or need, presents a compelling solution that addresses the problem, demonstrates genuine value proposition
            2. Evidence & Proof: Provides credible data, testimonials, or case studies, shows measurable results or outcomes, backs up claims with concrete evidence
            3. Differentiation: Explains what makes the solution unique, compares favorably to alternatives, shows competitive advantages
            4. Target Fit: Relevant to the audience's specific needs, appropriate for their industry/situation, addresses their decision-making criteria
            5. Implementation: Clear on how the solution works, realistic timeline and requirements, addresses potential obstacles or concerns
            6. Credibility: Presenter demonstrates expertise and knowledge, professional delivery and materials, honest about limitations or challenges
            7. Business Case: Shows return on investment or cost-benefit, pricing is reasonable and justified, financial impact is clear
            8. Next Steps: Clear call to action, reasonable follow-up process, makes it easy to move forward
            
            Respond with a JSON object indicating which criteria this message addresses:
            {{
                "problem_solution": true/false,
                "evidence_proof": true/false,
                "differentiation": true/false,
                "target_fit": true/false,
                "implementation": true/false,
                "credibility": true/false,
                "business_case": true/false,
                "next_steps": true/false
            }}
            """
            
            try:
                response = self.llm.complete(evaluation_prompt)
                evaluation_result = json.loads(str(response).strip())
                
                # Update criteria (only set to True if not already True)
                if evaluation_result.get("problem_solution", False):
                    state.criteria.problem_solution = True
                if evaluation_result.get("evidence_proof", False):
                    state.criteria.evidence_proof = True
                if evaluation_result.get("differentiation", False):
                    state.criteria.differentiation = True
                if evaluation_result.get("target_fit", False):
                    state.criteria.target_fit = True
                if evaluation_result.get("implementation", False):
                    state.criteria.implementation = True
                if evaluation_result.get("credibility", False):
                    state.criteria.credibility = True
                if evaluation_result.get("business_case", False):
                    state.criteria.business_case = True
                if evaluation_result.get("next_steps", False):
                    state.criteria.next_steps = True
                
                # Calculate result
                is_passing = state.criteria.is_passing()
                score_percentage = state.criteria.get_score_percentage()
                
                result = "yes" if is_passing else "no"
                
                # Store evaluation details
                state.last_evaluation = f"Score: {score_percentage:.1f}% ({result})"
                
                return result
                
            except Exception as e:
                return f"Error evaluating message: {str(e)}"
        
        return FunctionTool.from_defaults(
            fn=update_checklist,
            name="update_checklist",
            description="Evaluate if the latest message from the user ticks any of the sales pitch criteria and update the criteria for that conversation. Returns 'yes' if at least 60% of criteria are met, 'no' if less than 60% criteria are met."
        )
    
    def _create_agent(self) -> ReActAgent:
        """Create the ReAct agent with tools."""
        
        tools = [self._create_update_checklist_tool()]
        
        system_prompt = """
        You are a sales pitch evaluation assistant. Your role is to help evaluate sales pitches against a comprehensive checklist of criteria.
        
        You have access to a tool called 'update_checklist' that evaluates messages against sales pitch criteria and returns 'yes' if at least 60% of criteria are met, 'no' otherwise.
        
        When a user provides a sales pitch message, use the update_checklist tool to evaluate it and provide feedback on:
        1. Which criteria were addressed in the message
        2. The current overall score
        3. Suggestions for improvement
        4. What criteria still need to be addressed
        
        Be helpful, constructive, and specific in your feedback.
        """
        
        agent = ReActAgent(
            name="SalesPitchEvaluator",
            description="An agent that evaluates sales pitches against comprehensive criteria",
            tools=tools,
            llm=self.llm,
            system_prompt=system_prompt,
            verbose=True
        )
        
        return agent
    
    def initialize_conversation(self, conversation_id: str, company_info: CompanyInfo) -> str:
        """Initialize a new conversation with company information."""
        
        self.conversation_states[conversation_id] = ConversationState(
            company_info=company_info
        )
        
        return f"Conversation initialized for {company_info.name}. Ready to evaluate sales pitch messages."
    
    def get_conversation_status(self, conversation_id: str) -> Dict[str, Any]:
        """Get the current status of a conversation."""
        
        if conversation_id not in self.conversation_states:
            return {"error": "Conversation not found"}
        
        state = self.conversation_states[conversation_id]
        
        return {
            "company_info": state.company_info.dict(),
            "criteria_status": {
                "problem_solution": state.criteria.problem_solution,
                "evidence_proof": state.criteria.evidence_proof,
                "differentiation": state.criteria.differentiation,
                "target_fit": state.criteria.target_fit,
                "implementation": state.criteria.implementation,
                "credibility": state.criteria.credibility,
                "business_case": state.criteria.business_case,
                "next_steps": state.criteria.next_steps,
            },
            "score_percentage": state.criteria.get_score_percentage(),
            "is_passing": state.criteria.is_passing(),
            "last_evaluation": state.last_evaluation,
            "message_count": len(state.conversation_history)
        }
    
    def chat(self, conversation_id: str, message: str) -> str:
        """Process a chat message and evaluate the sales pitch."""
        
        if conversation_id not in self.conversation_states:
            return "Error: Conversation not found. Please initialize with company information first."
        
        # Get the update_checklist tool and call it directly
        update_checklist_tool = self._create_update_checklist_tool()
        
        # Call the tool's function directly
        result = update_checklist_tool.fn(
            conversation_id=conversation_id,
            user_message=message,
            company_context=""
        )
        
        # Get the current status for feedback
        state = self.conversation_states[conversation_id]
        criteria_met = sum([
            state.criteria.problem_solution,
            state.criteria.evidence_proof,
            state.criteria.differentiation,
            state.criteria.target_fit,
            state.criteria.implementation,
            state.criteria.credibility,
            state.criteria.business_case,
            state.criteria.next_steps
        ])
        
        # Create feedback response
        response_parts = [f"Evaluation result: {result}"]
        response_parts.append(f"Progress: {criteria_met}/8 criteria met ({state.criteria.get_score_percentage():.1f}%)")
        
        # Add specific feedback on what was addressed
        if "yes" in result.lower():
            response_parts.append("Great job! You've met enough criteria for a successful pitch.")
        else:
            missing_criteria = []
            if not state.criteria.problem_solution:
                missing_criteria.append("Problem & Solution")
            if not state.criteria.evidence_proof:
                missing_criteria.append("Evidence & Proof")
            if not state.criteria.differentiation:
                missing_criteria.append("Differentiation")
            if not state.criteria.target_fit:
                missing_criteria.append("Target Fit")
            if not state.criteria.implementation:
                missing_criteria.append("Implementation")
            if not state.criteria.credibility:
                missing_criteria.append("Credibility")
            if not state.criteria.business_case:
                missing_criteria.append("Business Case")
            if not state.criteria.next_steps:
                missing_criteria.append("Next Steps")
            
            if missing_criteria:
                response_parts.append(f"Still need to address: {', '.join(missing_criteria[:3])}")
        
        return "\n".join(response_parts)


class SalesPitchWorkflow(Workflow):
    """Workflow for sales pitch evaluation."""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.agent = SalesPitchAgent()
    
    @step
    async def initialize_conversation(
        self, ctx: Context, ev: StartEvent
    ) -> SalesPitchEvaluationEvent:
        """Initialize conversation with company information."""
        
        company_info = CompanyInfo(**ev.company_info)
        conversation_id = ev.conversation_id
        
        result = self.agent.initialize_conversation(conversation_id, company_info)
        
        return SalesPitchEvaluationEvent(
            message="Conversation initialized",
            evaluation_result={"status": result}
        )
    
    @step
    async def evaluate_message(
        self, ctx: Context, ev: SalesPitchEvaluationEvent
    ) -> StopEvent:
        """Evaluate a sales pitch message."""
        
        conversation_id = ctx.data.get("conversation_id")
        message = ev.message
        
        if not conversation_id:
            return StopEvent(result={"error": "No conversation ID provided"})
        
        # Process the message
        response = self.agent.chat(conversation_id, message)
        
        # Get current status
        status = self.agent.get_conversation_status(conversation_id)
        
        return StopEvent(result={
            "response": response,
            "status": status
        })


# Global instance
sales_pitch_agent = SalesPitchAgent()
