/**
 * Practice problems for Sentinel's LeetCode-style mode.
 *
 * Every problem is stdin/stdout based so that the exact same judge works for
 * JavaScript, Python, Java and C++ without per-language argument marshalling.
 * The starter code already parses the input; the learner fills in ONE
 * function (marked by __BODY__ in the template).
 *
 * tests[].visible === true  -> shown as the problem's examples and run by "Run"
 * tests[].visible === false -> hidden, only run by "Submit"
 */

const FILL_MARKER = "__BODY__";

/** Replace the __BODY__ line with `body`, keeping the marker line's indentation. */
function fillTemplate(template, body) {
  return template
    .split("\n")
    .flatMap((line) => {
      const idx = line.indexOf(FILL_MARKER);
      if (idx === -1) return [line];
      const indent = line.slice(0, idx);
      return body.split("\n").map((b) => (b.length ? indent + b : b));
    })
    .join("\n");
}

/** Small deterministic PRNG so "random" big tests are identical on every run. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const T = (input, expected, extra = {}) => ({ input, expected, visible: false, ...extra });
const V = (input, expected, explanation) => ({ input, expected, visible: true, explanation });

/* ------------------------------------------------------------------ */
/* 1. Two Sum                                                          */
/* ------------------------------------------------------------------ */

const twoSumBig = (() => {
  const n = 30000;
  const nums = Array.from({ length: n }, (_, i) => i * 2); // distinct evens
  const target = nums[n - 2] + nums[n - 1]; // only the top two elements add up to this
  return T(`${n}\n${nums.join(" ")}\n${target}\n`, `${n - 2} ${n - 1}`);
})();

const twoSum = {
  id: "two-sum",
  title: "Two Sum",
  difficulty: "Easy",
  topic: "Array",
  subtopic: "Hashing",
  tags: ["Array", "Hash Table"],
  statement:
    "Given an array of integers `nums` and an integer `target`, find the two numbers whose sum is exactly `target`.\n\n" +
    "Exactly one valid pair exists, and you may not use the same element twice. " +
    "Print the two **0-based indices**, smaller index first.",
  inputFormat: "Line 1: `n`, the length of the array.\nLine 2: `n` space-separated integers.\nLine 3: the integer `target`.",
  outputFormat: "Two integers `i j` (with `i < j`) separated by a single space.",
  constraints: [
    "2 <= n <= 30000",
    "-10^9 <= nums[i], target <= 10^9",
    "Exactly one pair of indices gives the target sum.",
    "Aim for O(n) time; an O(n^2) scan will time out on the largest tests.",
  ],
  tests: [
    V("4\n2 7 11 15\n9\n", "0 1", "nums[0] + nums[1] = 2 + 7 = 9."),
    V("3\n3 2 4\n6\n", "1 2", "nums[1] + nums[2] = 2 + 4 = 6."),
    V("2\n3 3\n6\n", "0 1", "The same value can appear twice, as long as they are different elements."),
    T("5\n-1 -2 -3 -4 -5\n-8\n", "2 4"),
    T("4\n0 4 3 0\n0\n", "0 3"),
    T("5\n1 5 3 7 9\n16\n", "3 4"),
    twoSumBig,
  ],
  templates: {
    js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[1].trim().split(/\\s+/).map(Number);
const target = parseInt(lines[2]);

/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]} the two indices [i, j] with i < j
 */
function twoSum(nums, target) {
  ${FILL_MARKER}
}

const [i, j] = twoSum(nums, target);
console.log(i + " " + j);
`,
    py: `import sys


def two_sum(nums, target):
    ${FILL_MARKER}


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    target = int(data[1 + n])
    i, j = two_sum(nums, target)
    print(i, j)


main()
`,
    java: `import java.util.*;

class Main {
    // Return the two indices {i, j} with i < j.
    static int[] twoSum(int[] nums, int target) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int target = sc.nextInt();
        int[] ans = twoSum(nums, target);
        System.out.println(ans[0] + " " + ans[1]);
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

// Return the two indices {i, j} with i < j.
vector<int> twoSum(vector<int>& nums, int target) {
    ${FILL_MARKER}
}

int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    for (auto& x : nums) cin >> x;
    int target;
    cin >> target;
    vector<int> ans = twoSum(nums, target);
    cout << ans[0] << " " << ans[1] << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn [-1, -1];",
    py: "# Your code here\nreturn -1, -1",
    java: "// Your code here\nreturn new int[]{-1, -1};",
    cpp: "// Your code here\nreturn {-1, -1};",
  },
};

/* ------------------------------------------------------------------ */
/* 2. Valid Parentheses                                                */
/* ------------------------------------------------------------------ */

const validParentheses = {
  id: "valid-parentheses",
  title: "Valid Parentheses",
  difficulty: "Easy",
  topic: "String",
  subtopic: "Stack",
  tags: ["String", "Stack"],
  statement:
    "Given a string `s` made only of the characters `(`, `)`, `{`, `}`, `[` and `]`, decide whether it is **valid**.\n\n" +
    "A string is valid when every opening bracket is closed by the same type of bracket, and brackets are closed in the correct order.",
  inputFormat: "One line containing the string `s`.",
  outputFormat: "Print `true` if `s` is valid, otherwise `false` (lowercase).",
  constraints: ["1 <= s.length <= 10^4", "s consists only of the characters ()[]{}"],
  tests: [
    V("()\n", "true", "One pair, correctly closed."),
    V("()[]{}\n", "true", "Three separate pairs."),
    V("(]\n", "false", "The bracket types don't match."),
    T("([)]\n", "false"),
    T("{[]}\n", "true"),
    T("(\n", "false"),
    T(")\n", "false"),
    T("((()))\n", "true"),
    T("(((((\n", "false"),
    T("[({})]\n", "true"),
    T("){\n", "false"),
    T(`${"(".repeat(5000)}${")".repeat(5000)}\n`, "true"),
    T(`${"()".repeat(4999)}(\n`, "false"),
    T(`${"{[(".repeat(3000)}${")]}".repeat(3000)}\n`, "true"),
  ],
  templates: {
    js: `const s = require("fs").readFileSync(0, "utf8").split("\\n")[0].trim();

/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  ${FILL_MARKER}
}

console.log(isValid(s) ? "true" : "false");
`,
    py: `import sys


def is_valid(s):
    ${FILL_MARKER}


s = sys.stdin.readline().strip()
print("true" if is_valid(s) else "false")
`,
    java: `import java.util.*;

class Main {
    static boolean isValid(String s) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine().trim();
        System.out.println(isValid(s) ? "true" : "false");
    }
}
`,
    cpp: `#include <iostream>
#include <string>
#include <stack>
using namespace std;

bool isValid(const string& s) {
    ${FILL_MARKER}
}

int main() {
    string s;
    getline(cin, s);
    while (!s.empty() && (s.back() == '\\r' || s.back() == ' ')) s.pop_back();
    cout << (isValid(s) ? "true" : "false") << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn false;",
    py: "# Your code here\nreturn False",
    java: "// Your code here\nreturn false;",
    cpp: "// Your code here\nreturn false;",
  },
};

/* ------------------------------------------------------------------ */
/* 3. Maximum Subarray                                                 */
/* ------------------------------------------------------------------ */

function kadane(arr) {
  let best = -Infinity;
  let cur = 0;
  for (const x of arr) {
    cur = Math.max(x, cur + x);
    best = Math.max(best, cur);
  }
  return best;
}

const maxSubBigRandom = (() => {
  const rand = lcg(20260921);
  const n = 100000;
  const arr = Array.from({ length: n }, () => Math.floor(rand() * 20001) - 10000);
  return T(`${n}\n${arr.join(" ")}\n`, String(kadane(arr)));
})();

const maxSubarray = {
  id: "maximum-subarray",
  title: "Maximum Subarray",
  difficulty: "Medium",
  topic: "Array",
  subtopic: "Kadane's Pattern",
  tags: ["Array", "Dynamic Programming"],
  statement:
    "Given an integer array `nums`, find the contiguous subarray (containing at least one element) with the **largest sum**, and print that sum.",
  inputFormat: "Line 1: `n`, the length of the array.\nLine 2: `n` space-separated integers.",
  outputFormat: "A single integer: the maximum subarray sum.",
  constraints: ["1 <= n <= 10^5", "-10^4 <= nums[i] <= 10^4", "An O(n) solution is expected."],
  tests: [
    V("9\n-2 1 -3 4 -1 2 1 -5 4\n", "6", "The subarray [4, -1, 2, 1] has the largest sum, 6."),
    V("1\n1\n", "1", "A single element is a valid subarray."),
    V("5\n5 4 -1 7 8\n", "23", "The whole array is the best subarray."),
    T("1\n-1\n", "-1"),
    T("2\n-2 -1\n", "-1"),
    T("3\n-3 -2 -5\n", "-2"),
    T("4\n8 -19 5 -4\n", "8"),
    T("7\n-2 -3 4 -1 -2 1 5\n", "7"),
    T(`100000\n${Array(100000).fill(10000).join(" ")}\n`, "1000000000"),
    T(`100000\n${Array(100000).fill(-10000).join(" ")}\n`, "-10000"),
    maxSubBigRandom,
  ],
  templates: {
    js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[1].trim().split(/\\s+/).map(Number);

/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
  ${FILL_MARKER}
}

console.log(String(maxSubArray(nums)));
`,
    py: `import sys


def max_sub_array(nums):
    ${FILL_MARKER}


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    print(max_sub_array(nums))


main()
`,
    java: `import java.util.*;

class Main {
    static int maxSubArray(int[] nums) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        System.out.println(maxSubArray(nums));
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int maxSubArray(vector<int>& nums) {
    ${FILL_MARKER}
}

int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    for (auto& x : nums) cin >> x;
    cout << maxSubArray(nums) << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn 0;",
    py: "# Your code here\nreturn 0",
    java: "// Your code here\nreturn 0;",
    cpp: "// Your code here\nreturn 0;",
  },
};

/* ------------------------------------------------------------------ */
/* 4. Binary Search                                                    */
/* ------------------------------------------------------------------ */

const binaryBig = (() => {
  const n = 100000;
  const nums = Array.from({ length: n }, (_, i) => i * 2); // 0,2,4,...,199998
  const list = nums.join(" ");
  return [
    T(`${n}\n${list}\n199998\n`, String(n - 1)),
    T(`${n}\n${list}\n0\n`, "0"),
    T(`${n}\n${list}\n100001\n`, "-1"),
    T(`${n}\n${list}\n${nums[54321]}\n`, "54321"),
  ];
})();

const binarySearch = {
  id: "binary-search",
  title: "Binary Search",
  difficulty: "Easy",
  topic: "Array",
  subtopic: "Sorting & Binary Search",
  tags: ["Array", "Binary Search"],
  statement:
    "You are given an array of **distinct** integers sorted in ascending order, and a `target` value.\n\n" +
    "Print the index of `target` in the array, or `-1` if it is not present. Your solution should run in **O(log n)** time.",
  inputFormat: "Line 1: `n`, the length of the array.\nLine 2: `n` space-separated integers in ascending order.\nLine 3: the integer `target`.",
  outputFormat: "A single integer: the 0-based index of `target`, or -1.",
  constraints: ["1 <= n <= 10^5", "-10^9 <= nums[i], target <= 10^9", "All values in nums are distinct and sorted ascending."],
  tests: [
    V("6\n-1 0 3 5 9 12\n9\n", "4", "9 is at index 4."),
    V("6\n-1 0 3 5 9 12\n2\n", "-1", "2 is not in the array."),
    V("1\n5\n5\n", "0", "A one-element array."),
    T("1\n5\n-5\n", "-1"),
    T("2\n1 3\n3\n", "1"),
    T("2\n1 3\n1\n", "0"),
    T("5\n1 2 3 4 5\n6\n", "-1"),
    T("5\n1 2 3 4 5\n0\n", "-1"),
    ...binaryBig,
  ],
  templates: {
    js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[1].trim().split(/\\s+/).map(Number);
const target = parseInt(lines[2]);

/**
 * @param {number[]} nums  sorted ascending, distinct
 * @param {number} target
 * @return {number} index of target, or -1
 */
function search(nums, target) {
  ${FILL_MARKER}
}

console.log(String(search(nums, target)));
`,
    py: `import sys


def search(nums, target):
    ${FILL_MARKER}


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    target = int(data[1 + n])
    print(search(nums, target))


main()
`,
    java: `import java.util.*;

class Main {
    static int search(int[] nums, int target) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int target = sc.nextInt();
        System.out.println(search(nums, target));
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int search(vector<int>& nums, int target) {
    ${FILL_MARKER}
}

int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    for (auto& x : nums) cin >> x;
    int target;
    cin >> target;
    cout << search(nums, target) << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn -1;",
    py: "# Your code here\nreturn -1",
    java: "// Your code here\nreturn -1;",
    cpp: "// Your code here\nreturn -1;",
  },
};

/* ------------------------------------------------------------------ */
/* 5. Longest Substring Without Repeating Characters                   */
/* ------------------------------------------------------------------ */

const ascii95 = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");

const longestSubstring = {
  id: "longest-substring",
  title: "Longest Substring Without Repeating Characters",
  difficulty: "Medium",
  topic: "String",
  subtopic: "Sliding Window",
  tags: ["String", "Sliding Window", "Hash Table"],
  statement:
    "Given a string `s`, find the length of the **longest substring** that contains no repeated characters.\n\n" +
    "A substring is a contiguous run of characters inside `s`.",
  inputFormat: "One line containing the string `s` (letters, digits, symbols and spaces are all possible).",
  outputFormat: "A single integer: the length of the longest substring without repeating characters.",
  constraints: ["1 <= s.length <= 5 * 10^4", "s consists of printable ASCII characters (including spaces).", "Aim for O(n) time."],
  tests: [
    V("abcabcbb\n", "3", 'The answer is "abc", with length 3.'),
    V("bbbbb\n", "1", 'The answer is "b", with length 1.'),
    V("pwwkew\n", "3", 'The answer is "wke", with length 3. Note "pwke" is a subsequence, not a substring.'),
    T("a\n", "1"),
    T("au\n", "2"),
    T("dvdf\n", "3"),
    T("abba\n", "2"),
    T("tmmzuxt\n", "5"),
    T("anviaj\n", "5"),
    T("ab cab\n", "4"),
    T(`${"abcdefghijklmnopqrstuvwxyz".repeat(1000)}\n`, "26"),
    T(`${ascii95.repeat(500)}\n`, "95"),
  ],
  templates: {
    js: `const s = require("fs").readFileSync(0, "utf8").split("\\n")[0].replace(/\\r$/, "");

/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
  ${FILL_MARKER}
}

console.log(String(lengthOfLongestSubstring(s)));
`,
    py: `import sys


def length_of_longest_substring(s):
    ${FILL_MARKER}


s = sys.stdin.readline().rstrip("\\r\\n")
print(length_of_longest_substring(s))
`,
    java: `import java.util.*;

class Main {
    static int lengthOfLongestSubstring(String s) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine();
        if (s.endsWith("\\r")) s = s.substring(0, s.length() - 1);
        System.out.println(lengthOfLongestSubstring(s));
    }
}
`,
    cpp: `#include <iostream>
#include <string>
#include <vector>
#include <unordered_map>
#include <algorithm>
using namespace std;

int lengthOfLongestSubstring(const string& s) {
    ${FILL_MARKER}
}

int main() {
    string s;
    getline(cin, s);
    if (!s.empty() && s.back() == '\\r') s.pop_back();
    cout << lengthOfLongestSubstring(s) << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn 0;",
    py: "# Your code here\nreturn 0",
    java: "// Your code here\nreturn 0;",
    cpp: "// Your code here\nreturn 0;",
  },
};

/* ------------------------------------------------------------------ */
/* 6. Climbing Stairs                                                  */
/* ------------------------------------------------------------------ */

const climbingStairs = {
  id: "climbing-stairs",
  title: "Climbing Stairs",
  difficulty: "Easy",
  topic: "Math & DP Basics",
  subtopic: "Basic DP",
  tags: ["Math", "Dynamic Programming"],
  statement:
    "You are climbing a staircase with `n` steps. Each move you can climb either **1 or 2** steps.\n\n" +
    "In how many distinct ways can you reach the top?",
  inputFormat: "One line containing the integer `n`.",
  outputFormat: "A single integer: the number of distinct ways.",
  constraints: ["1 <= n <= 45", "A plain recursive solution will be far too slow for the largest n."],
  tests: [
    V("2\n", "2", "Two ways: 1+1 or 2."),
    V("3\n", "3", "Three ways: 1+1+1, 1+2, or 2+1."),
    V("4\n", "5", "Five ways in total."),
    T("1\n", "1"),
    T("5\n", "8"),
    T("10\n", "89"),
    T("20\n", "10946"),
    T("30\n", "1346269"),
    T("45\n", "1836311903"),
  ],
  templates: {
    js: `const n = parseInt(require("fs").readFileSync(0, "utf8").trim());

/**
 * @param {number} n
 * @return {number}
 */
function climbStairs(n) {
  ${FILL_MARKER}
}

console.log(String(climbStairs(n)));
`,
    py: `import sys


def climb_stairs(n):
    ${FILL_MARKER}


n = int(sys.stdin.readline())
print(climb_stairs(n))
`,
    java: `import java.util.*;

class Main {
    static long climbStairs(int n) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        System.out.println(climbStairs(n));
    }
}
`,
    cpp: `#include <iostream>
using namespace std;

long long climbStairs(int n) {
    ${FILL_MARKER}
}

int main() {
    int n;
    cin >> n;
    cout << climbStairs(n) << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn 0;",
    py: "# Your code here\nreturn 0",
    java: "// Your code here\nreturn 0;",
    cpp: "// Your code here\nreturn 0;",
  },
};

/* ------------------------------------------------------------------ */
/* 7. Contains Duplicate                                               */
/* ------------------------------------------------------------------ */

function containsDupRef(nums) {
  const seen = new Set();
  for (const x of nums) {
    if (seen.has(x)) return true;
    seen.add(x);
  }
  return false;
}

const containsDupBigFalse = (() => {
  const n = 100000;
  const nums = Array.from({ length: n }, (_, i) => i); // all distinct
  return T(`${n}\n${nums.join(" ")}\n`, containsDupRef(nums) ? "true" : "false");
})();

const containsDupBigTrue = (() => {
  const n = 100000;
  const nums = Array.from({ length: n }, (_, i) => i);
  nums[n - 1] = 0; // force one duplicate right at the end
  return T(`${n}\n${nums.join(" ")}\n`, containsDupRef(nums) ? "true" : "false");
})();

const containsDuplicate = {
  id: "contains-duplicate",
  title: "Contains Duplicate",
  difficulty: "Easy",
  topic: "Array",
  subtopic: "Hashing",
  tags: ["Array", "Hash Table"],
  statement:
    "Given an integer array `nums`, print `true` if any value appears **at least twice**, and `false` if every element is distinct.\n\n" +
    "This is the simplest possible use of a hash set: walk the array once, and remember what you've already seen.",
  inputFormat: "Line 1: `n`, the length of the array.\nLine 2: `n` space-separated integers.",
  outputFormat: "Print `true` or `false` (lowercase).",
  constraints: ["1 <= n <= 10^5", "-10^9 <= nums[i] <= 10^9", "Aim for O(n) time using a hash set."],
  tests: [
    V("5\n1 2 3 1 5\n", "true", "1 appears twice, so the array contains a duplicate."),
    V("4\n1 2 3 4\n", "false", "All four elements are different."),
    V("1\n1\n", "false", "A single element can never repeat."),
    T("2\n1 1\n", "true"),
    T("6\n0 -1 2 -1 3 4\n", "true"),
    T("3\n-5 -5 -5\n", "true"),
    T("5\n5 4 3 2 1\n", "false"),
    containsDupBigFalse,
    containsDupBigTrue,
  ],
  templates: {
    js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[1].trim().split(/\\s+/).map(Number);

/**
 * @param {number[]} nums
 * @return {boolean}
 */
function containsDuplicate(nums) {
  ${FILL_MARKER}
}

console.log(containsDuplicate(nums) ? "true" : "false");
`,
    py: `import sys


def contains_duplicate(nums):
    ${FILL_MARKER}


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    print("true" if contains_duplicate(nums) else "false")


main()
`,
    java: `import java.util.*;

class Main {
    static boolean containsDuplicate(int[] nums) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        System.out.println(containsDuplicate(nums) ? "true" : "false");
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <unordered_set>
using namespace std;

bool containsDuplicate(vector<int>& nums) {
    ${FILL_MARKER}
}

int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    for (auto& x : nums) cin >> x;
    cout << (containsDuplicate(nums) ? "true" : "false") << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn false;",
    py: "# Your code here\nreturn False",
    java: "// Your code here\nreturn false;",
    cpp: "// Your code here\nreturn false;",
  },
};

/* ------------------------------------------------------------------ */
/* 8. Move Zeroes                                                      */
/* ------------------------------------------------------------------ */

function moveZeroesRef(nums) {
  const out = nums.filter((x) => x !== 0);
  while (out.length < nums.length) out.push(0);
  return out;
}

const moveZeroesBig = (() => {
  const rand = lcg(7734);
  const n = 100000;
  const nums = Array.from({ length: n }, () => (rand() < 0.3 ? 0 : Math.floor(rand() * 2001) - 1000));
  return T(`${n}\n${nums.join(" ")}\n`, moveZeroesRef(nums).join(" "));
})();

const moveZeroes = {
  id: "move-zeroes",
  title: "Move Zeroes",
  difficulty: "Easy",
  topic: "Array",
  subtopic: "Two Pointers",
  tags: ["Array", "Two Pointers"],
  statement:
    "Given an integer array `nums`, move all `0`s to the end of the array while keeping the **relative order** of the non-zero elements the same.\n\n" +
    "Print the resulting array. Try to do it with a single pass using two pointers (a 'write' pointer and a 'read' pointer), without allocating a second array.",
  inputFormat: "Line 1: `n`, the length of the array.\nLine 2: `n` space-separated integers.",
  outputFormat: "The `n` integers of the rearranged array, space-separated.",
  constraints: ["1 <= n <= 10^5", "-10^4 <= nums[i] <= 10^4"],
  tests: [
    V("5\n0 1 0 3 12\n", "1 3 12 0 0", "The non-zero elements 1, 3, 12 keep their order; both zeroes move to the end."),
    V("1\n0\n", "0", "A single zero has nowhere to move."),
    V("3\n1 2 3\n", "1 2 3", "There are no zeroes, so the array is unchanged."),
    T("4\n0 0 0 1\n", "1 0 0 0"),
    T("6\n4 0 5 0 0 6\n", "4 5 6 0 0 0"),
    T("2\n0 0\n", "0 0"),
    T("5\n1 0 2 0 3\n", "1 2 3 0 0"),
    T("6\n-1 0 -2 0 3 0\n", "-1 -2 3 0 0 0"),
    moveZeroesBig,
  ],
  templates: {
    js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[1].trim().split(/\\s+/).map(Number);

/**
 * @param {number[]} nums
 * @return {number[]} nums with every 0 moved to the end, order of the rest kept
 */
function moveZeroes(nums) {
  ${FILL_MARKER}
}

console.log(moveZeroes(nums).join(" "));
`,
    py: `import sys


def move_zeroes(nums):
    ${FILL_MARKER}


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    print(" ".join(map(str, move_zeroes(nums))))


main()
`,
    java: `import java.util.*;

class Main {
    static int[] moveZeroes(int[] nums) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int[] ans = moveZeroes(nums);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < ans.length; i++) {
            if (i > 0) sb.append(" ");
            sb.append(ans[i]);
        }
        System.out.println(sb.toString());
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

vector<int> moveZeroes(vector<int>& nums) {
    ${FILL_MARKER}
}

int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    for (auto& x : nums) cin >> x;
    vector<int> ans = moveZeroes(nums);
    for (size_t i = 0; i < ans.size(); i++) {
        if (i) cout << " ";
        cout << ans[i];
    }
    cout << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn nums;",
    py: "# Your code here\nreturn nums",
    java: "// Your code here\nreturn nums;",
    cpp: "// Your code here\nreturn nums;",
  },
};

/* ------------------------------------------------------------------ */
/* 9. Find Pivot Index                                                 */
/* ------------------------------------------------------------------ */

function pivotIndexRef(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  let leftSum = 0;
  for (let i = 0; i < nums.length; i++) {
    const rightSum = total - leftSum - nums[i];
    if (leftSum === rightSum) return i;
    leftSum += nums[i];
  }
  return -1;
}

const pivotIndexBig = (() => {
  const rand = lcg(505050);
  const n = 100000;
  const nums = Array.from({ length: n }, () => Math.floor(rand() * 21) - 10);
  return T(`${n}\n${nums.join(" ")}\n`, String(pivotIndexRef(nums)));
})();

const findPivotIndex = {
  id: "find-pivot-index",
  title: "Find Pivot Index",
  difficulty: "Easy",
  topic: "Array",
  subtopic: "Prefix Sum",
  tags: ["Array", "Prefix Sum"],
  statement:
    "Given an integer array `nums`, find the **leftmost pivot index** - an index where the sum of every element to its left equals the sum of every element to its right (both sums are `0` if there's nothing on that side).\n\n" +
    "If no such index exists, print `-1`.\n\n" +
    "This is the classic prefix-sum trick: keep a running left-sum as you scan, and derive the right-sum from `total - leftSum - nums[i]` instead of recomputing it every time.",
  inputFormat: "Line 1: `n`, the length of the array.\nLine 2: `n` space-separated integers.",
  outputFormat: "A single integer: the leftmost pivot index, or -1 if none exists.",
  constraints: ["1 <= n <= 10^5", "-1000 <= nums[i] <= 1000", "Aim for O(n) time using a running (prefix) sum."],
  tests: [
    V("6\n1 7 3 6 5 6\n", "3", "Left of index 3: 1+7+3 = 11. Right of index 3: 5+6 = 11."),
    V("3\n1 2 3\n", "-1", "No index has equal sums on both sides."),
    V("1\n0\n", "0", "There's nothing on either side, so both sums are 0 and they're equal."),
    T("1\n5\n", "0"),
    T("2\n1 -1\n", "-1"),
    T("4\n-1 -1 -1 0\n", "1"),
    T("5\n2 1 -1 1 2\n", "1"),
    T("7\n0 0 0 0 0 0 0\n", "0"),
    pivotIndexBig,
  ],
  templates: {
    js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[1].trim().split(/\\s+/).map(Number);

/**
 * @param {number[]} nums
 * @return {number} the leftmost pivot index, or -1
 */
function pivotIndex(nums) {
  ${FILL_MARKER}
}

console.log(String(pivotIndex(nums)));
`,
    py: `import sys


def pivot_index(nums):
    ${FILL_MARKER}


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    print(pivot_index(nums))


main()
`,
    java: `import java.util.*;

class Main {
    static int pivotIndex(int[] nums) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        System.out.println(pivotIndex(nums));
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int pivotIndex(vector<int>& nums) {
    ${FILL_MARKER}
}

int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    for (auto& x : nums) cin >> x;
    cout << pivotIndex(nums) << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn -1;",
    py: "# Your code here\nreturn -1",
    java: "// Your code here\nreturn -1;",
    cpp: "// Your code here\nreturn -1;",
  },
};

/* ------------------------------------------------------------------ */
/* 10. Maximum Sum Subarray of Size K                                  */
/* ------------------------------------------------------------------ */

function maxSumSubarrayKRef(nums, k) {
  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += nums[i];
  let best = windowSum;
  for (let i = k; i < nums.length; i++) {
    windowSum += nums[i] - nums[i - k];
    best = Math.max(best, windowSum);
  }
  return best;
}

const maxSumWindowBig = (() => {
  const rand = lcg(909090);
  const n = 100000;
  const k = 500;
  const nums = Array.from({ length: n }, () => Math.floor(rand() * 2001) - 1000);
  return T(`${n} ${k}\n${nums.join(" ")}\n`, String(maxSumSubarrayKRef(nums, k)));
})();

const maxSumSubarrayK = {
  id: "max-sum-subarray-size-k",
  title: "Maximum Sum Subarray of Size K",
  difficulty: "Easy",
  topic: "Array",
  subtopic: "Sliding Window",
  tags: ["Array", "Sliding Window"],
  statement:
    "Given an integer array `nums` and an integer `k`, find the **maximum sum** of any contiguous subarray of exactly `k` elements.\n\n" +
    "This is the simplest form of the sliding-window pattern: instead of re-summing every window from scratch (which is slow), " +
    "slide the window one step at a time by subtracting the element that leaves and adding the element that enters.",
  inputFormat: "Line 1: two integers `n` and `k`.\nLine 2: `n` space-separated integers.",
  outputFormat: "A single integer: the maximum sum among all windows of size `k`.",
  constraints: ["1 <= k <= n <= 10^5", "-1000 <= nums[i] <= 1000", "Aim for O(n) time, not O(n*k)."],
  tests: [
    V("8 3\n2 1 5 1 3 2 7 1\n", "12", "The window [3, 2, 7] gives the largest sum among all size-3 windows: 3 + 2 + 7 = 12."),
    V("5 1\n4 -2 9 -1 5\n", "9", "With k = 1, the answer is just the largest single element."),
    V("4 4\n1 2 3 4\n", "10", "k equals n, so the only window is the whole array."),
    T("6 2\n1 2 3 4 5 6\n", "11"),
    T("5 2\n-1 -2 -3 -4 -5\n", "-3"),
    T("1 1\n7\n", "7"),
    T("7 3\n-5 4 -2 3 -6 7 2\n", "5"),
    maxSumWindowBig,
  ],
  templates: {
    js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const [n, k] = lines[0].trim().split(/\\s+/).map(Number);
const nums = lines[1].trim().split(/\\s+/).map(Number);

/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number} max sum of any contiguous subarray of size k
 */
function maxSumSubarray(nums, k) {
  ${FILL_MARKER}
}

console.log(String(maxSumSubarray(nums, k)));
`,
    py: `import sys


def max_sum_subarray(nums, k):
    ${FILL_MARKER}


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    k = int(data[1])
    nums = list(map(int, data[2:2 + n]))
    print(max_sum_subarray(nums, k))


main()
`,
    java: `import java.util.*;

class Main {
    static long maxSumSubarray(int[] nums, int k) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int k = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        System.out.println(maxSumSubarray(nums, k));
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

long long maxSumSubarray(vector<int>& nums, int k) {
    ${FILL_MARKER}
}

int main() {
    int n, k;
    cin >> n >> k;
    vector<int> nums(n);
    for (auto& x : nums) cin >> x;
    cout << maxSumSubarray(nums, k) << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn 0;",
    py: "# Your code here\nreturn 0",
    java: "// Your code here\nreturn 0;",
    cpp: "// Your code here\nreturn 0;",
  },
};

/* ------------------------------------------------------------------ */
/* 11. Search Insert Position                                         */
/* ------------------------------------------------------------------ */

function searchInsertRef(nums, target) {
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const searchInsertBig = (() => {
  const n = 100000;
  const nums = Array.from({ length: n }, (_, i) => i * 2);
  return [
    T(`${n}\n${nums.join(" ")}\n${nums[70000]}\n`, String(searchInsertRef(nums, nums[70000]))),
    T(`${n}\n${nums.join(" ")}\n-5\n`, String(searchInsertRef(nums, -5))),
    T(`${n}\n${nums.join(" ")}\n${nums[n - 1] + 10}\n`, String(searchInsertRef(nums, nums[n - 1] + 10))),
    T(`${n}\n${nums.join(" ")}\n${nums[12345] + 1}\n`, String(searchInsertRef(nums, nums[12345] + 1))),
  ];
})();

const searchInsertPosition = {
  id: "search-insert-position",
  title: "Search Insert Position",
  difficulty: "Easy",
  topic: "Array",
  subtopic: "Sorting & Binary Search",
  tags: ["Array", "Binary Search"],
  statement:
    "You are given an array of **distinct** integers sorted in ascending order, and a `target` value.\n\n" +
    "If `target` is found, print its index. Otherwise, print the index where it **would be inserted** to keep the array sorted.\n\n" +
    "This is Binary Search's very close cousin - same O(log n) approach, just a small tweak to what you return when the target isn't found.",
  inputFormat: "Line 1: `n`, the length of the array.\nLine 2: `n` space-separated integers in ascending order.\nLine 3: the integer `target`.",
  outputFormat: "A single integer: the index of `target`, or the index to insert it at.",
  constraints: ["1 <= n <= 10^5", "-10^9 <= nums[i], target <= 10^9", "All values in nums are distinct and sorted ascending.", "Aim for O(log n) time."],
  tests: [
    V("4\n1 3 5 6\n5\n", "2", "5 is already in the array, at index 2."),
    V("4\n1 3 5 6\n2\n", "1", "2 isn't present, but it belongs between 1 and 3, i.e. index 1."),
    V("4\n1 3 5 6\n7\n", "4", "7 is bigger than everything, so it goes at the very end."),
    T("4\n1 3 5 6\n0\n", "0"),
    T("1\n1\n1\n", "0"),
    T("1\n1\n0\n", "0"),
    T("1\n1\n2\n", "1"),
    T("5\n1 2 4 6 8\n5\n", "3"),
    ...searchInsertBig,
  ],
  templates: {
    js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[1].trim().split(/\\s+/).map(Number);
const target = parseInt(lines[2]);

/**
 * @param {number[]} nums  sorted ascending, distinct
 * @param {number} target
 * @return {number} index of target, or the index to insert it at
 */
function searchInsert(nums, target) {
  ${FILL_MARKER}
}

console.log(String(searchInsert(nums, target)));
`,
    py: `import sys


def search_insert(nums, target):
    ${FILL_MARKER}


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    target = int(data[1 + n])
    print(search_insert(nums, target))


main()
`,
    java: `import java.util.*;

class Main {
    static int searchInsert(int[] nums, int target) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int target = sc.nextInt();
        System.out.println(searchInsert(nums, target));
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int searchInsert(vector<int>& nums, int target) {
    ${FILL_MARKER}
}

int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    for (auto& x : nums) cin >> x;
    int target;
    cin >> target;
    cout << searchInsert(nums, target) << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn 0;",
    py: "# Your code here\nreturn 0",
    java: "// Your code here\nreturn 0;",
    cpp: "// Your code here\nreturn 0;",
  },
};

/* ------------------------------------------------------------------ */
/* 12. Best Time to Buy and Sell Stock                                 */
/* ------------------------------------------------------------------ */

function maxProfitRef(prices) {
  let minPrice = Infinity;
  let best = 0;
  for (const p of prices) {
    if (p < minPrice) minPrice = p;
    else best = Math.max(best, p - minPrice);
  }
  return best;
}

const maxProfitBig = (() => {
  const rand = lcg(313131);
  const n = 100000;
  const prices = Array.from({ length: n }, () => Math.floor(rand() * 10000));
  return T(`${n}\n${prices.join(" ")}\n`, String(maxProfitRef(prices)));
})();

const bestTimeToBuySell = {
  id: "best-time-to-buy-sell-stock",
  title: "Best Time to Buy and Sell Stock",
  difficulty: "Easy",
  topic: "Array",
  subtopic: "Kadane's Pattern",
  tags: ["Array", "Greedy"],
  statement:
    "You are given an array `prices` where `prices[i]` is the price of a stock on day `i`.\n\n" +
    "You may buy on one day and sell on a **later** day, at most once. Find the maximum profit you can achieve. " +
    "If no profit is possible, print `0`.\n\n" +
    "This uses the same 'keep a running best-so-far while scanning once' idea as Maximum Subarray - here you track the lowest price seen so far, " +
    "and check how much you'd profit by selling today.",
  inputFormat: "Line 1: `n`, the number of days.\nLine 2: `n` space-separated integers, the prices.",
  outputFormat: "A single integer: the maximum achievable profit (0 if none).",
  constraints: ["1 <= n <= 10^5", "0 <= prices[i] <= 10^4", "Aim for O(n) time, a single pass."],
  tests: [
    V("6\n7 1 5 3 6 4\n", "5", "Buy at 1 (day 1), sell at 6 (day 4): profit 5."),
    V("5\n7 6 4 3 1\n", "0", "Prices only fall, so no transaction is profitable."),
    V("1\n5\n", "0", "You need at least two days to make a trade."),
    T("2\n1 2\n", "1"),
    T("2\n2 1\n", "0"),
    T("4\n3 3 3 3\n", "0"),
    T("7\n2 4 1 7 3 8 2\n", "7"),
    maxProfitBig,
  ],
  templates: {
    js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const prices = lines[1].trim().split(/\\s+/).map(Number);

/**
 * @param {number[]} prices
 * @return {number} max profit from one buy + one later sell
 */
function maxProfit(prices) {
  ${FILL_MARKER}
}

console.log(String(maxProfit(prices)));
`,
    py: `import sys


def max_profit(prices):
    ${FILL_MARKER}


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    prices = list(map(int, data[1:1 + n]))
    print(max_profit(prices))


main()
`,
    java: `import java.util.*;

class Main {
    static int maxProfit(int[] prices) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] prices = new int[n];
        for (int i = 0; i < n; i++) prices[i] = sc.nextInt();
        System.out.println(maxProfit(prices));
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int maxProfit(vector<int>& prices) {
    ${FILL_MARKER}
}

int main() {
    int n;
    cin >> n;
    vector<int> prices(n);
    for (auto& x : prices) cin >> x;
    cout << maxProfit(prices) << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn 0;",
    py: "# Your code here\nreturn 0",
    java: "// Your code here\nreturn 0;",
    cpp: "// Your code here\nreturn 0;",
  },
};

/* ------------------------------------------------------------------ */
/* 13. Running Sum of 1D Array (LeetCode 1480)                         */
/* ------------------------------------------------------------------ */

const runningSumBig = (() => {
  const rand = lcg(148014801);
  const n = 20000; // large enough to stress O(n) vs O(n^2), small enough that the printed array stays under the output cap
  const nums = Array.from({ length: n }, () => Math.floor(rand() * 2001) - 1000);
  const out = [];
  let s = 0;
  for (const x of nums) {
    s += x;
    out.push(s);
  }
  return T(`${n}\n${nums.join(" ")}\n`, out.join(" "));
})();

const runningSum1DArray = {
  id: "running-sum-1d-array",
  title: "Running Sum of 1D Array",
  difficulty: "Easy",
  topic: "Array",
  subtopic: "Prefix Sum",
  tags: ["Array", "Prefix Sum"],
  statement:
    "Given an array `nums`, return its **running sum**: `runningSum[i] = nums[0] + nums[1] + ... + nums[i]`.\n\n" +
    "This is the friendliest possible introduction to prefix sums - you're just carrying a running total as you scan left to right.",
  inputFormat: "Line 1: `n`, the length of the array.\nLine 2: `n` space-separated integers.",
  outputFormat: "`n` space-separated integers: the running sum.",
  constraints: ["1 <= n <= 10^5", "-10^6 <= nums[i] <= 10^6", "One pass, O(n) time."],
  tests: [
    V("4\n1 2 3 4\n", "1 3 6 10", "1, 1+2, 1+2+3, 1+2+3+4."),
    V("5\n1 1 1 1 1\n", "1 2 3 4 5", "Each running total is one more than the last."),
    V("5\n3 1 2 10 1\n", "3 4 6 16 17", "3, 3+1, 3+1+2, 3+1+2+10, 3+1+2+10+1."),
    T("6\n-2 5 3 -6 0 3\n", "-2 3 6 0 0 3"),
    T("3\n0 0 0\n", "0 0 0"),
    T("1\n7\n", "7"),
    runningSumBig,
  ],
  templates: {
    js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[1].trim().split(/\\s+/).map(Number);

/**
 * @param {number[]} nums
 * @return {number[]} the running sum
 */
function runningSum(nums) {
  ${FILL_MARKER}
}

console.log(runningSum(nums).join(" "));
`,
    py: `import sys


def running_sum(nums):
    ${FILL_MARKER}


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    print(" ".join(map(str, running_sum(nums))))


main()
`,
    java: `import java.util.*;

class Main {
    static int[] runningSum(int[] nums) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        int[] out = runningSum(nums);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < out.length; i++) {
            if (i > 0) sb.append(" ");
            sb.append(out[i]);
        }
        System.out.println(sb.toString());
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

vector<int> runningSum(vector<int>& nums) {
    ${FILL_MARKER}
}

int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    for (auto& x : nums) cin >> x;
    vector<int> out = runningSum(nums);
    for (size_t i = 0; i < out.size(); i++) {
        if (i) cout << " ";
        cout << out[i];
    }
    cout << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn nums.map(() => 0);",
    py: "# Your code here\nreturn [0] * len(nums)",
    java: "// Your code here\nreturn new int[nums.length];",
    cpp: "// Your code here\nreturn vector<int>(nums.size(), 0);",
  },
};

/* ------------------------------------------------------------------ */
/* 14. Product of Array Except Self (LeetCode 238)                     */
/* ------------------------------------------------------------------ */

const productExceptSelfBig = (() => {
  const rand = lcg(238238238);
  const n = 20000; // large enough to stress O(n) vs O(n^2), small enough that the printed array stays under the output cap
  const nums = Array.from({ length: n }, () => (rand() < 0.5 ? 1 : -1));
  // A handful of bigger "signal" values, scattered through the mostly-+-/-1
  // array, keep the running product small enough to compare exactly while
  // still exercising the full O(n) length.
  const signalPositions = [0, 1, 2, 10000, 19997, 19998, 19999];
  const signalValues = [2, 3, -2, 5, -4, 6, -3];
  signalPositions.forEach((pos, idx) => {
    nums[pos] = signalValues[idx];
  });
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
  return T(`${n}\n${nums.join(" ")}\n`, out.join(" "));
})();

const productExceptSelf = {
  id: "product-of-array-except-self",
  title: "Product of Array Except Self",
  difficulty: "Medium",
  topic: "Array",
  subtopic: "Prefix Sum",
  tags: ["Array", "Prefix Sum"],
  statement:
    "Given an integer array `nums` of length `n` (`n >= 2`), return an array `answer` where `answer[i]` is the " +
    "product of every element in `nums` **except** `nums[i]` - **without using division**, in O(n) time.\n\n" +
    "Builds directly on Running Sum: instead of a running *sum* from the left, keep a running *product* from the left, " +
    "then do a second pass keeping a running product from the right and multiply the two together.",
  inputFormat: "Line 1: `n`, the length of the array.\nLine 2: `n` space-separated integers.",
  outputFormat: "`n` space-separated integers: the product of all elements except the one at that index.",
  constraints: [
    "2 <= n <= 10^5",
    "-30 <= nums[i] <= 30",
    "The product of the whole array (and of any prefix/suffix) fits in a 64-bit integer.",
    "No division allowed. Aim for O(n) time.",
  ],
  tests: [
    V("4\n1 2 3 4\n", "24 12 8 6", "answer[0] = 2*3*4 = 24, answer[1] = 1*3*4 = 12, and so on."),
    V("5\n-1 1 0 -3 3\n", "0 0 9 0 0", "Whenever there's a zero elsewhere in the array, every OTHER product becomes 0."),
    V("2\n2 3\n", "3 2", "answer[0] is just nums[1], and answer[1] is just nums[0]."),
    T("2\n1 1\n", "1 1"),
    T("4\n4 0 0 -2\n", "0 0 0 0"),
    T("5\n1 2 3 4 5\n", "120 60 40 30 24"),
    productExceptSelfBig,
  ],
  templates: {
    js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[1].trim().split(/\\s+/).map(Number);

/**
 * @param {number[]} nums
 * @return {number[]}
 */
function productExceptSelf(nums) {
  ${FILL_MARKER}
}

console.log(productExceptSelf(nums).join(" "));
`,
    py: `import sys


def product_except_self(nums):
    ${FILL_MARKER}


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    print(" ".join(map(str, product_except_self(nums))))


main()
`,
    java: `import java.util.*;

class Main {
    static long[] productExceptSelf(int[] nums) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        long[] out = productExceptSelf(nums);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < out.length; i++) {
            if (i > 0) sb.append(" ");
            sb.append(out[i]);
        }
        System.out.println(sb.toString());
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

vector<long long> productExceptSelf(vector<int>& nums) {
    ${FILL_MARKER}
}

int main() {
    int n;
    cin >> n;
    vector<int> nums(n);
    for (auto& x : nums) cin >> x;
    vector<long long> out = productExceptSelf(nums);
    for (size_t i = 0; i < out.size(); i++) {
        if (i) cout << " ";
        cout << out[i];
    }
    cout << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn nums.map(() => 0);",
    py: "# Your code here\nreturn [0] * len(nums)",
    java: "// Your code here\nreturn new long[nums.length];",
    cpp: "// Your code here\nreturn vector<long long>(nums.size(), 0);",
  },
};

/* ------------------------------------------------------------------ */
/* 15. Minimum Penalty for a Shop (LeetCode 2483)                      */
/* ------------------------------------------------------------------ */

const minPenaltyShopBig = (() => {
  const rand = lcg(2483248);
  const n = 100000;
  let s = "";
  for (let i = 0; i < n; i++) s += rand() < 0.5 ? "Y" : "N";
  let totalY = 0;
  for (const c of s) if (c === "Y") totalY++;
  let best = totalY;
  let bestJ = 0;
  let countN = 0;
  let countY = 0;
  for (let j = 1; j <= n; j++) {
    if (s[j - 1] === "N") countN++;
    else countY++;
    const penalty = countN + (totalY - countY);
    if (penalty < best) {
      best = penalty;
      bestJ = j;
    }
  }
  return T(`${s}\n`, String(bestJ));
})();

const minPenaltyShop = {
  id: "minimum-penalty-for-a-shop",
  title: "Minimum Penalty for a Shop",
  difficulty: "Medium",
  topic: "String",
  subtopic: "Prefix Sum",
  tags: ["String", "Prefix Sum"],
  statement:
    "You're given a string `customers` of `'Y'`/`'N'` characters, one per hour: `'Y'` means a customer shows up that hour, " +
    "`'N'` means nobody does.\n\n" +
    "If the shop closes at hour `j` (`0 <= j <= n`), it pays a penalty of **1 for every hour before `j` where a customer " +
    "was turned away (`'N'` while open makes no sense to count, so really: for every hour *before* `j` the shop is open " +
    "with no customer)** plus **1 for every hour at or after `j` where a customer shows up while the shop is closed**.\n\n" +
    "More precisely: penalty(j) = (number of `'N'` among hours `[0, j)`) + (number of `'Y'` among hours `[j, n)`). " +
    "Print the **earliest** hour `j` that minimizes this penalty.\n\n" +
    "Same trick as Find Pivot Index: precompute the total number of `'Y'`s once, then scan left to right keeping a " +
    "running count of `'N'`s seen so far (open-side penalty) and deriving the closed-side penalty from `totalY - Ys seen so far`.",
  inputFormat: "One line containing the string `customers` (characters `'Y'` and `'N'` only).",
  outputFormat: "A single integer: the earliest closing hour `j` with minimum penalty.",
  constraints: ["1 <= customers.length <= 10^5", "customers consists only of the characters 'Y' and 'N'.", "Aim for O(n) time."],
  tests: [
    V("YYNY\n", "2", "Closing at hour 2: hours 0-1 were open with customers (no penalty), and only the customer at hour 3 is missed - penalty 1, the minimum, and the earliest hour that achieves it."),
    V("NNNNN\n", "0", "No customers ever come, so closing immediately (penalty 0) is best."),
    V("YYYY\n", "4", "Customers come every hour, so staying open the whole time (closing at the end) is best."),
    T("N\n", "0"),
    T("Y\n", "1"),
    T("YNNNYYYN\n", "1"),
    T("NYNNY\n", "0"),
    minPenaltyShopBig,
  ],
  templates: {
    js: `const s = require("fs").readFileSync(0, "utf8").split("\\n")[0].trim();

/**
 * @param {string} customers
 * @return {number} earliest hour j minimizing penalty
 */
function bestClosingTime(customers) {
  ${FILL_MARKER}
}

console.log(String(bestClosingTime(s)));
`,
    py: `import sys


def best_closing_time(customers):
    ${FILL_MARKER}


s = sys.stdin.readline().strip()
print(best_closing_time(s))
`,
    java: `import java.util.*;

class Main {
    static int bestClosingTime(String customers) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine().trim();
        System.out.println(bestClosingTime(s));
    }
}
`,
    cpp: `#include <iostream>
#include <string>
using namespace std;

int bestClosingTime(const string& customers) {
    ${FILL_MARKER}
}

int main() {
    string s;
    getline(cin, s);
    while (!s.empty() && (s.back() == '\\r' || s.back() == ' ')) s.pop_back();
    cout << bestClosingTime(s) << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn 0;",
    py: "# Your code here\nreturn 0",
    java: "// Your code here\nreturn 0;",
    cpp: "// Your code here\nreturn 0;",
  },
};

/* ------------------------------------------------------------------ */
/* 16. Reducing Dishes (LeetCode 1402) - Challenge / Hard               */
/* ------------------------------------------------------------------ */

const reducingDishesBig = (() => {
  const rand = lcg(140214021);
  const n = 20000;
  const arr = Array.from({ length: n }, () => Math.floor(rand() * 2001) - 1000);
  const sorted = [...arr].sort((a, b) => a - b);
  let total = 0;
  let suffix = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    suffix += sorted[i];
    if (suffix < 0) break;
    total += suffix;
  }
  return T(`${n}\n${arr.join(" ")}\n`, String(Math.max(total, 0)));
})();

const reducingDishes = {
  id: "reducing-dishes",
  title: "Reducing Dishes",
  difficulty: "Hard",
  topic: "Array",
  subtopic: "Greedy & Sorting (Challenge)",
  tags: ["Array", "Greedy", "Sorting"],
  statement:
    "A chef has `n` dishes, `satisfaction[i]` being the satisfaction level of the `i`-th dish. The chef can cook any " +
    "**subset** of the dishes, in any order. Cooking takes unit time per dish, and time starts at 1 for the first dish " +
    "cooked. The **like-time coefficient** of a dish is `satisfaction[i] * time[i]`. Return the **maximum possible sum** " +
    "of like-time coefficients (skipping dishes that would only hurt the total; the answer is never negative).\n\n" +
    "**This one's a genuine step up in difficulty** - a nice challenge once the easier Array problems feel comfortable. " +
    "Two facts make it tractable: (1) an optimal cooking order is always the *sorted-ascending* order of the chosen dishes " +
    "(save your best dishes for last, when they're multiplied by the biggest time), and (2) the optimal chosen set is " +
    "always a **suffix** of the sorted array - i.e. \"drop some number of the worst dishes\", never a scattered subset. " +
    "So: sort ascending, then walk from the tastiest dish backwards, keeping a running suffix-sum; each dish you add " +
    "effectively shifts every already-chosen dish's time by +1 too, so adding it changes the total by exactly the " +
    "current suffix-sum. Stop as soon as that suffix-sum would go negative.",
  inputFormat: "Line 1: `n`, the number of dishes.\nLine 2: `n` space-separated integers, the satisfaction levels.",
  outputFormat: "A single integer: the maximum sum of like-time coefficients (0 if cooking nothing is best).",
  constraints: ["1 <= n <= 10^5", "-10^5 <= satisfaction[i] <= 10^5", "Use a 64-bit accumulator - the sum can be large."],
  tests: [
    V(
      "5\n-1 -8 0 5 -9\n",
      "14",
      "Cook satisfaction -1, 0, 5 in that order (times 1, 2, 3): -1*1 + 0*2 + 5*3 = 14. The other two dishes only hurt the total."
    ),
    V("3\n4 3 2\n", "20", "Cook all three, ascending: 2*1 + 3*2 + 4*3 = 2 + 6 + 12 = 20."),
    V("3\n-1 -4 -5\n", "0", "Every dish is net-negative however it's ordered, so cook nothing and score 0."),
    T("6\n-2 5 -1 0 3 -3\n", "35"),
    T("1\n1\n", "1"),
    T("1\n-1\n", "0"),
    T("3\n0 0 0\n", "0"),
    reducingDishesBig,
  ],
  templates: {
    js: `const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const satisfaction = lines[1].trim().split(/\\s+/).map(Number);

/**
 * @param {number[]} satisfaction
 * @return {number}
 */
function maxSatisfaction(satisfaction) {
  ${FILL_MARKER}
}

console.log(String(maxSatisfaction(satisfaction)));
`,
    py: `import sys


def max_satisfaction(satisfaction):
    ${FILL_MARKER}


def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    satisfaction = list(map(int, data[1:1 + n]))
    print(max_satisfaction(satisfaction))


main()
`,
    java: `import java.util.*;

class Main {
    static long maxSatisfaction(int[] satisfaction) {
        ${FILL_MARKER}
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] satisfaction = new int[n];
        for (int i = 0; i < n; i++) satisfaction[i] = sc.nextInt();
        System.out.println(maxSatisfaction(satisfaction));
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

long long maxSatisfaction(vector<int>& satisfaction) {
    ${FILL_MARKER}
}

int main() {
    int n;
    cin >> n;
    vector<int> satisfaction(n);
    for (auto& x : satisfaction) cin >> x;
    cout << maxSatisfaction(satisfaction) << endl;
    return 0;
}
`,
  },
  stubs: {
    js: "// Your code here\nreturn 0;",
    py: "# Your code here\nreturn 0",
    java: "// Your code here\nreturn 0;",
    cpp: "// Your code here\nreturn 0;",
  },
};

/* ------------------------------------------------------------------ */
/* Ordered for a beginner's learning journey:                          */
/*   Array -> Hashing -> Two Pointers -> Prefix Sum -> Sliding Window   */
/*         -> Sorting & Binary Search -> Kadane's Pattern               */
/*         -> Greedy & Sorting (Challenge)                              */
/*   String -> Stack -> Prefix Sum -> Sliding Window                    */
/*   Math & DP Basics -> Basic DP                                       */
/* Within every pattern, easiest problem first so difficulty ramps up   */
/* gradually instead of jumping from Easy straight into Hard.           */
/* ------------------------------------------------------------------ */

const PROBLEMS = [
  // Array > Hashing
  containsDuplicate,
  twoSum,
  // Array > Two Pointers
  moveZeroes,
  // Array > Prefix Sum
  runningSum1DArray,
  findPivotIndex,
  productExceptSelf,
  // Array > Sliding Window
  maxSumSubarrayK,
  // Array > Sorting & Binary Search
  binarySearch,
  searchInsertPosition,
  // Array > Kadane's Pattern
  bestTimeToBuySell,
  maxSubarray,
  // Array > Greedy & Sorting (Challenge)
  reducingDishes,
  // String > Stack
  validParentheses,
  // String > Prefix Sum
  minPenaltyShop,
  // String > Sliding Window
  longestSubstring,
  // Math & DP Basics > Basic DP
  climbingStairs,
];

const byId = new Map(PROBLEMS.map((p) => [p.id, p]));

function getProblem(id) {
  return byId.get(id) || null;
}

function starterFor(problem, language) {
  const template = problem.templates[language];
  if (!template) return "";
  return fillTemplate(template, problem.stubs[language] || "");
}

/** Shape sent to the browser for the problem list (no statements / tests). */
function toSummary(problem) {
  return {
    id: problem.id,
    title: problem.title,
    difficulty: problem.difficulty,
    topic: problem.topic || "General",
    subtopic: problem.subtopic || "",
    tags: problem.tags,
  };
}

/** Full problem for the browser. Hidden tests are never included. */
function toDetail(problem) {
  return {
    ...toSummary(problem),
    statement: problem.statement,
    inputFormat: problem.inputFormat,
    outputFormat: problem.outputFormat,
    constraints: problem.constraints,
    examples: problem.tests
      .filter((t) => t.visible)
      .map((t) => ({ input: t.input, output: t.expected, explanation: t.explanation || "" })),
    hiddenTestCount: problem.tests.filter((t) => !t.visible).length,
    starter: Object.fromEntries(Object.keys(problem.templates).map((lang) => [lang, starterFor(problem, lang)])),
  };
}

module.exports = { PROBLEMS, getProblem, toSummary, toDetail, starterFor, fillTemplate };
