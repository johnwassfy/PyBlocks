"""
🔍 CODE DIFFERENTIATION UTILITY
Identifies and separates starter code from user-written code

This ensures all AI services only provide feedback on user code,
not on starter code provided by the mission.
"""

from typing import Dict, List, Tuple, Optional


class CodeDifferentiator:
    """
    Identifies which code portions are starter code vs user-written
    """
    
    @staticmethod
    def extract_starter_code(mission_id: str, mission_context: Dict) -> str:
        """
        Extract starter code from mission context
        
        Args:
            mission_id: ID of the mission
            mission_context: Mission metadata from request
            
        Returns:
            Starter code string (empty if no starter code)
        """
        # Try multiple possible fields where starter code might be stored
        starter_code = (
            mission_context.get('starter_code') or
            mission_context.get('startingCode') or
            mission_context.get('template') or
            mission_context.get('boilerplate') or
            mission_context.get('code_template') or
            ""
        )
        
        return starter_code.strip()
    
    @staticmethod
    def identify_user_additions(
        current_code: str,
        starter_code: str
    ) -> Dict[str, any]:
        """
        Identify which lines in current_code are user-added vs starter
        
        Args:
            current_code: Full code from submission
            starter_code: Starter code template
            
        Returns:
            Dict with user_code, starter_lines, user_lines
        """
        current_lines = current_code.split('\n')
        starter_lines = starter_code.split('\n') if starter_code else []
        
        user_lines = []
        user_line_numbers = []
        starter_line_numbers = []
        
        if not starter_code:
            # No starter code, all code is user-written
            return {
                'has_starter_code': False,
                'user_code': current_code,
                'user_line_numbers': list(range(1, len(current_lines) + 1)),
                'starter_line_numbers': [],
                'user_lines': current_lines,
                'starter_lines': [],
                'analysis': 'No starter code - entire submission is user-written'
            }
        
        # Try to match starter code lines at the beginning
        matched_starter_lines = 0
        for i, starter_line in enumerate(starter_lines):
            if i < len(current_lines) and CodeDifferentiator._lines_match(
                current_lines[i], starter_line
            ):
                matched_starter_lines = i + 1
                starter_line_numbers.append(i + 1)
            else:
                break
        
        # Lines after starter code are user-written
        for i in range(matched_starter_lines, len(current_lines)):
            user_lines.append(current_lines[i])
            user_line_numbers.append(i + 1)
        
        # If starter code is at the end or mixed, use different strategy
        if not user_line_numbers and starter_code:
            # Try to find starter code anywhere in the submission
            starter_code_normalized = CodeDifferentiator._normalize_code(starter_code)
            current_code_normalized = CodeDifferentiator._normalize_code(current_code)
            
            if starter_code_normalized in current_code_normalized:
                # Starter code is embedded - find position
                start_idx = current_code.find(starter_code)
                if start_idx != -1:
                    end_idx = start_idx + len(starter_code)
                    
                    # Code before starter
                    before_starter = current_code[:start_idx].strip()
                    # Code after starter
                    after_starter = current_code[end_idx:].strip()
                    
                    user_code = (before_starter + '\n' + after_starter).strip()
                    
                    if user_code:
                        user_lines = user_code.split('\n')
                        # Calculate approximate line numbers
                        before_lines = len(before_starter.split('\n')) if before_starter else 0
                        after_lines = len(after_starter.split('\n')) if after_starter else 0
                        
                        user_line_numbers = (
                            list(range(1, before_lines + 1)) +
                            list(range(start_idx + len(starter_code), len(current_lines) + 1))
                        )
        
        return {
            'has_starter_code': bool(starter_code),
            'user_code': '\n'.join(user_lines),
            'user_line_numbers': user_line_numbers,
            'starter_line_numbers': starter_line_numbers,
            'user_lines': user_lines,
            'starter_lines': current_lines[:matched_starter_lines],
            'analysis': f'Identified {len(starter_line_numbers)} starter lines, {len(user_line_numbers)} user lines'
        }
    
    @staticmethod
    def _lines_match(line1: str, line2: str, tolerance: float = 0.8) -> bool:
        """
        Check if two lines are similar (accounting for whitespace differences)
        
        Args:
            line1: First line
            line2: Second line
            tolerance: Similarity threshold (0-1)
            
        Returns:
            True if lines are similar enough
        """
        # Normalize whitespace
        norm1 = ' '.join(line1.split())
        norm2 = ' '.join(line2.split())
        
        if norm1 == norm2:
            return True
        
        # Check similarity using character matching
        if not norm1 or not norm2:
            return norm1 == norm2
        
        matches = sum(1 for a, b in zip(norm1, norm2) if a == b)
        max_len = max(len(norm1), len(norm2))
        similarity = matches / max_len if max_len > 0 else 0
        
        return similarity >= tolerance
    
    @staticmethod
    def _normalize_code(code: str) -> str:
        """
        Normalize code for comparison (remove extra whitespace/comments)
        
        Args:
            code: Code to normalize
            
        Returns:
            Normalized code string
        """
        lines = code.split('\n')
        normalized = []
        
        for line in lines:
            # Remove comments
            if '#' in line:
                line = line[:line.index('#')]
            
            # Normalize whitespace
            line = ' '.join(line.split())
            
            if line:
                normalized.append(line)
        
        return '\n'.join(normalized)
    
    @staticmethod
    def mark_code_sections(
        code: str,
        user_line_numbers: List[int]
    ) -> str:
        """
        Mark user-written vs starter code in display format
        
        Args:
            code: Full code
            user_line_numbers: Line numbers that are user-written
            
        Returns:
            Code with markup showing user vs starter sections
        """
        lines = code.split('\n')
        marked_lines = []
        user_set = set(user_line_numbers)
        
        for i, line in enumerate(lines, 1):
            if i in user_set:
                marked_lines.append(f"[USER] {i:2d} | {line}")
            else:
                marked_lines.append(f"[STR]  {i:2d} | {line}")
        
        return '\n'.join(marked_lines)
    
    @staticmethod
    def create_user_code_context(
        current_code: str,
        user_line_numbers: List[int],
        context_lines: int = 2
    ) -> str:
        """
        Create context showing user code with surrounding context
        
        Args:
            current_code: Full code
            user_line_numbers: Lines that are user-written
            context_lines: How many lines of context to show around user code
            
        Returns:
            Formatted string with user code and context
        """
        if not user_line_numbers:
            return "[NO USER CODE DETECTED]\n(Only starter code present)"
        
        lines = current_code.split('\n')
        user_set = set(user_line_numbers)
        
        # Find ranges of user code
        ranges = []
        start = None
        
        for i in sorted(user_set):
            if start is None:
                start = i
            elif i != start + (len(ranges[-1][1]) if ranges else 0):
                ranges.append((start, list(range(start, i))))
                start = i
        
        if start is not None:
            ranges.append((start, list(range(start, max(user_set) + 1))))
        
        # Build context
        context_parts = []
        processed_lines = set()
        
        for start_line, user_lines_in_range in ranges:
            # Add context before
            context_start = max(1, start_line - context_lines)
            context_before = list(range(context_start, start_line))
            
            # Add context after
            context_end = min(len(lines), max(user_lines_in_range) + context_lines + 1)
            context_after = list(range(max(user_lines_in_range) + 1, context_end))
            
            # Combine and display
            all_lines = context_before + user_lines_in_range + context_after
            
            context_text = "📝 USER CODE SECTION:\n"
            for line_num in all_lines:
                if line_num in processed_lines:
                    continue
                processed_lines.add(line_num)
                
                marker = "→ " if line_num in user_lines_in_range else "  "
                context_text += f"{marker}{line_num:2d} | {lines[line_num - 1]}\n"
            
            context_parts.append(context_text)
        
        return '\n'.join(context_parts)


class RequestCodeExtractor:
    """
    Extract and differentiate code from different request types
    """
    
    @staticmethod
    def extract_from_analyze_request(request_data: Dict) -> Dict:
        """Extract code info from /analyze request"""
        return {
            'code': request_data.get('submission_context', {}).get('code', ''),
            'starter_code': request_data.get('mission_context', {}).get('starter_code', ''),
            'mission_id': request_data.get('missionId', ''),
            'mission_context': request_data.get('mission_context', {})
        }
    
    @staticmethod
    def extract_from_chat_request(request_data: Dict) -> Dict:
        """Extract code info from /chat request"""
        return {
            'code': request_data.get('code', ''),
            'starter_code': '',  # Not always available in chat
            'mission_id': request_data.get('missionId', ''),
            'mission_context': {}
        }
    
    @staticmethod
    def extract_from_behavior_request(request_data: Dict) -> Dict:
        """Extract code info from /behavior request"""
        activity = request_data.get('activity', {})
        return {
            'code': activity.get('codeSnapshot', ''),
            'starter_code': '',  # Not available in behavior
            'mission_id': request_data.get('missionId', ''),
            'mission_context': {}
        }
    
    @staticmethod
    def process_request(
        request_data: Dict,
        service_type: str
    ) -> Dict:
        """
        Process request to differentiate code types
        
        Args:
            request_data: Full request payload
            service_type: 'analyze', 'chat', 'hint', 'behavior', etc.
            
        Returns:
            Processed dict with user_code, starter_code, line mappings
        """
        # Extract based on service
        if service_type == 'analyze':
            extraction = RequestCodeExtractor.extract_from_analyze_request(request_data)
        elif service_type == 'chat':
            extraction = RequestCodeExtractor.extract_from_chat_request(request_data)
        elif service_type == 'behavior':
            extraction = RequestCodeExtractor.extract_from_behavior_request(request_data)
        else:
            extraction = {
                'code': request_data.get('code', ''),
                'starter_code': '',
                'mission_id': '',
                'mission_context': {}
            }
        
        # Differentiate user code
        differentiation = CodeDifferentiator.identify_user_additions(
            extraction['code'],
            extraction['starter_code']
        )
        
        return {
            **extraction,
            **differentiation,
            'context': CodeDifferentiator.create_user_code_context(
                extraction['code'],
                differentiation['user_line_numbers']
            )
        }
