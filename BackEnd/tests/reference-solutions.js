/**
 * Known-correct bodies for every practice problem, in every language.
 * They are dropped into the same templates learners get, and verify.js runs
 * them against ALL test cases (hidden ones included). If a test's expected
 * output were wrong, or a starter template didn't compile, this catches it.
 */
module.exports = {
  "two-sum": {
    js: `const seen = new Map();
for (let i = 0; i < nums.length; i++) {
  const need = target - nums[i];
  if (seen.has(need)) return [seen.get(need), i];
  seen.set(nums[i], i);
}
return [-1, -1];`,
    py: `seen = {}
for i, x in enumerate(nums):
    need = target - x
    if need in seen:
        return seen[need], i
    seen[x] = i
return -1, -1`,
    java: `Map<Integer, Integer> seen = new HashMap<>();
for (int i = 0; i < nums.length; i++) {
    Integer j = seen.get(target - nums[i]);
    if (j != null) return new int[]{j, i};
    seen.put(nums[i], i);
}
return new int[]{-1, -1};`,
    cpp: `unordered_map<int, int> seen;
for (int i = 0; i < (int)nums.size(); i++) {
    auto it = seen.find(target - nums[i]);
    if (it != seen.end()) return {it->second, i};
    seen[nums[i]] = i;
}
return {-1, -1};`,
  },

  "valid-parentheses": {
    js: `const pairs = { ")": "(", "]": "[", "}": "{" };
const stack = [];
for (const ch of s) {
  if (ch in pairs) {
    if (stack.pop() !== pairs[ch]) return false;
  } else {
    stack.push(ch);
  }
}
return stack.length === 0;`,
    py: `pairs = {")": "(", "]": "[", "}": "{"}
stack = []
for ch in s:
    if ch in pairs:
        if not stack or stack.pop() != pairs[ch]:
            return False
    else:
        stack.append(ch)
return not stack`,
    java: `Deque<Character> stack = new ArrayDeque<>();
for (char ch : s.toCharArray()) {
    if (ch == '(' || ch == '[' || ch == '{') {
        stack.push(ch);
    } else {
        if (stack.isEmpty()) return false;
        char open = stack.pop();
        if ((ch == ')' && open != '(') || (ch == ']' && open != '[') || (ch == '}' && open != '{')) return false;
    }
}
return stack.isEmpty();`,
    cpp: `stack<char> st;
for (char ch : s) {
    if (ch == '(' || ch == '[' || ch == '{') {
        st.push(ch);
    } else {
        if (st.empty()) return false;
        char open = st.top();
        st.pop();
        if ((ch == ')' && open != '(') || (ch == ']' && open != '[') || (ch == '}' && open != '{')) return false;
    }
}
return st.empty();`,
  },

  "maximum-subarray": {
    js: `let best = nums[0];
let cur = nums[0];
for (let i = 1; i < nums.length; i++) {
  cur = Math.max(nums[i], cur + nums[i]);
  best = Math.max(best, cur);
}
return best;`,
    py: `best = cur = nums[0]
for x in nums[1:]:
    cur = max(x, cur + x)
    best = max(best, cur)
return best`,
    java: `int best = nums[0], cur = nums[0];
for (int i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
}
return best;`,
    cpp: `int best = nums[0], cur = nums[0];
for (size_t i = 1; i < nums.size(); i++) {
    cur = max(nums[i], cur + nums[i]);
    best = max(best, cur);
}
return best;`,
  },

  "binary-search": {
    js: `let lo = 0, hi = nums.length - 1;
while (lo <= hi) {
  const mid = Math.floor((lo + hi) / 2);
  if (nums[mid] === target) return mid;
  if (nums[mid] < target) lo = mid + 1;
  else hi = mid - 1;
}
return -1;`,
    py: `lo, hi = 0, len(nums) - 1
while lo <= hi:
    mid = (lo + hi) // 2
    if nums[mid] == target:
        return mid
    if nums[mid] < target:
        lo = mid + 1
    else:
        hi = mid - 1
return -1`,
    java: `int lo = 0, hi = nums.length - 1;
while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;
    if (nums[mid] == target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
}
return -1;`,
    cpp: `int lo = 0, hi = (int)nums.size() - 1;
while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;
    if (nums[mid] == target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
}
return -1;`,
  },

  "longest-substring": {
    js: `const last = new Map();
let best = 0;
let start = 0;
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (last.has(ch) && last.get(ch) >= start) start = last.get(ch) + 1;
  last.set(ch, i);
  best = Math.max(best, i - start + 1);
}
return best;`,
    py: `last = {}
best = 0
start = 0
for i, ch in enumerate(s):
    if ch in last and last[ch] >= start:
        start = last[ch] + 1
    last[ch] = i
    best = max(best, i - start + 1)
return best`,
    java: `int[] last = new int[256];
Arrays.fill(last, -1);
int best = 0, start = 0;
for (int i = 0; i < s.length(); i++) {
    int ch = s.charAt(i) & 0xFF;
    if (last[ch] >= start) start = last[ch] + 1;
    last[ch] = i;
    best = Math.max(best, i - start + 1);
}
return best;`,
    cpp: `vector<int> last(256, -1);
int best = 0, start = 0;
for (int i = 0; i < (int)s.size(); i++) {
    int ch = (unsigned char)s[i];
    if (last[ch] >= start) start = last[ch] + 1;
    last[ch] = i;
    best = max(best, i - start + 1);
}
return best;`,
  },

  "climbing-stairs": {
    js: `let a = 1, b = 1;
for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
return b;`,
    py: `a, b = 1, 1
for _ in range(2, n + 1):
    a, b = b, a + b
return b`,
    java: `long a = 1, b = 1;
for (int i = 2; i <= n; i++) {
    long c = a + b;
    a = b;
    b = c;
}
return b;`,
    cpp: `long long a = 1, b = 1;
for (int i = 2; i <= n; i++) {
    long long c = a + b;
    a = b;
    b = c;
}
return b;`,
  },

  "running-sum-1d-array": {
    js: `const out = [];
let s = 0;
for (const x of nums) {
  s += x;
  out.push(s);
}
return out;`,
    py: `out = []
s = 0
for x in nums:
    s += x
    out.append(s)
return out`,
    java: `int[] out = new int[nums.length];
int s = 0;
for (int i = 0; i < nums.length; i++) {
    s += nums[i];
    out[i] = s;
}
return out;`,
    cpp: `vector<int> out(nums.size());
int s = 0;
for (size_t i = 0; i < nums.size(); i++) {
    s += nums[i];
    out[i] = s;
}
return out;`,
  },

  "product-of-array-except-self": {
    js: `const n = nums.length;
const out = new Array(n).fill(1);
let left = 1;
for (let i = 0; i < n; i++) {
  out[i] = left;
  left *= nums[i];
}
let right = 1;
for (let i = n - 1; i >= 0; i--) {
  out[i] *= right;
  right *= nums[i];
}
return out;`,
    py: `n = len(nums)
out = [1] * n
left = 1
for i in range(n):
    out[i] = left
    left *= nums[i]
right = 1
for i in range(n - 1, -1, -1):
    out[i] *= right
    right *= nums[i]
return out`,
    java: `int n = nums.length;
long[] out = new long[n];
long left = 1;
for (int i = 0; i < n; i++) {
    out[i] = left;
    left *= nums[i];
}
long right = 1;
for (int i = n - 1; i >= 0; i--) {
    out[i] *= right;
    right *= nums[i];
}
return out;`,
    cpp: `int n = (int)nums.size();
vector<long long> out(n, 1);
long long left = 1;
for (int i = 0; i < n; i++) {
    out[i] = left;
    left *= nums[i];
}
long long right = 1;
for (int i = n - 1; i >= 0; i--) {
    out[i] *= right;
    right *= nums[i];
}
return out;`,
  },

  "minimum-penalty-for-a-shop": {
    js: `let totalY = 0;
for (const c of customers) if (c === "Y") totalY++;
let countN = 0, countY = 0;
let best = totalY, bestJ = 0;
for (let j = 1; j <= customers.length; j++) {
  if (customers[j - 1] === "N") countN++;
  else countY++;
  const penalty = countN + (totalY - countY);
  if (penalty < best) {
    best = penalty;
    bestJ = j;
  }
}
return bestJ;`,
    py: `total_y = customers.count("Y")
count_n = count_y = 0
best = total_y
best_j = 0
for j in range(1, len(customers) + 1):
    if customers[j - 1] == "N":
        count_n += 1
    else:
        count_y += 1
    penalty = count_n + (total_y - count_y)
    if penalty < best:
        best = penalty
        best_j = j
return best_j`,
    java: `int totalY = 0;
for (char c : customers.toCharArray()) if (c == 'Y') totalY++;
int countN = 0, countY = 0;
int best = totalY, bestJ = 0;
for (int j = 1; j <= customers.length(); j++) {
    if (customers.charAt(j - 1) == 'N') countN++;
    else countY++;
    int penalty = countN + (totalY - countY);
    if (penalty < best) {
        best = penalty;
        bestJ = j;
    }
}
return bestJ;`,
    cpp: `int totalY = 0;
for (char c : customers) if (c == 'Y') totalY++;
int countN = 0, countY = 0;
int best = totalY, bestJ = 0;
for (int j = 1; j <= (int)customers.size(); j++) {
    if (customers[j - 1] == 'N') countN++;
    else countY++;
    int penalty = countN + (totalY - countY);
    if (penalty < best) {
        best = penalty;
        bestJ = j;
    }
}
return bestJ;`,
  },

  "reducing-dishes": {
    js: `const arr = [...satisfaction].sort((a, b) => a - b);
let total = 0, suffix = 0;
for (let i = arr.length - 1; i >= 0; i--) {
  suffix += arr[i];
  if (suffix < 0) break;
  total += suffix;
}
return Math.max(total, 0);`,
    py: `arr = sorted(satisfaction)
total = 0
suffix = 0
for i in range(len(arr) - 1, -1, -1):
    suffix += arr[i]
    if suffix < 0:
        break
    total += suffix
return max(total, 0)`,
    java: `int[] arr = satisfaction.clone();
Arrays.sort(arr);
long total = 0, suffix = 0;
for (int i = arr.length - 1; i >= 0; i--) {
    suffix += arr[i];
    if (suffix < 0) break;
    total += suffix;
}
return Math.max(total, 0);`,
    cpp: `vector<int> arr = satisfaction;
sort(arr.begin(), arr.end());
long long total = 0, suffix = 0;
for (int i = (int)arr.size() - 1; i >= 0; i--) {
    suffix += arr[i];
    if (suffix < 0) break;
    total += suffix;
}
return max(total, 0LL);`,
  },
};
