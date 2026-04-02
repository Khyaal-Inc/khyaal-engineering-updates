---
name: performance-optimize
description: Identify and fix performance bottlenecks with measurable improvements
triggers:
  - optimize
  - improve performance
  - speed up
  - slow
auto_invoke: false
---

# Performance Optimization Skill

Optimize specific code for better performance by identifying actual bottlenecks.

## Workflow

1. **Identify bottleneck** - What's slow? (user reports or profiling data)
2. **Read target code** - Only the slow file/function
3. **Analyze issues** - Look for common problems:
   - N+1 queries or loops
   - Unnecessary re-renders (React/UI frameworks)
   - Large data processing without pagination
   - Memory leaks (event listeners, intervals)
   - Inefficient algorithms (O(n²) when O(n) possible)
4. **Apply fix** - Make targeted optimization
5. **Explain impact** - Expected improvement (2-3 sentences)

## Focus Areas

- **Avoid premature optimization** - Only optimize proven slow code
- **Measure impact** - Explain expected performance gain
- **Maintain readability** - Don't sacrifice code clarity for micro-optimizations

## Token Efficiency
- Read only the reported slow code section
- Don't profile entire codebase unless requested
- Use grep to find specific functions before reading files
