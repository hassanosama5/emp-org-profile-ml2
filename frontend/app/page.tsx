import Link from 'next/link';
import { Button } from '../components/shared/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/shared/ui/Card';

export default function HomePage() {
  const features = [
    {
      title: 'Employee Profiles',
      description:
        'Central repository for all employee information with self-service updates.',
    },
    {
      title: 'Organization Structure',
      description:
        'Define departments, positions, and hierarchical structures with role-based access.',
    },
    {
      title: 'Time Management',
      description:
        'Automated scheduling, attendance tracking, and policy enforcement.',
    },
    {
      title: 'Performance Management',
      description:
        'Structured appraisal cycles with transparent evaluation processes.',
    },
    {
      title: 'Payroll System',
      description:
        'Automated salary processing with tax compliance and self-service payslips.',
    },
    {
      title: 'Security & Compliance',
      description:
        'Role-based access control with audit trails and data governance.',
    },
  ];

  const benefits = [
    'Unified platform for entire employee lifecycle',
    'Automated workflows and approvals',
    'Real-time data synchronization',
    'Compliance with labor regulations',
    'Self-service portals for employees',
    'Comprehensive reporting and analytics',
  ];

  return (
    <div className="animate-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-white py-20">
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
              Unified HR Management{' '}
              <span className="text-blue-600">Platform</span>
            </h1>
            <p className="mb-8 text-lg text-gray-600 md:text-xl">
              Streamline your entire HR operations with our comprehensive
              platform. From recruitment to retirement, manage every aspect of
              the employee lifecycle in one place.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register" className="inline-flex items-center">
                  Get Started Free
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Comprehensive HR Solutions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to manage your workforce efficiently and
              effectively.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="transition-all hover:shadow-lg">
                <CardHeader>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold text-gray-900">
                Why Choose Our HR System?
              </h2>
              <p className="mb-8 text-lg text-gray-600">
                Our platform is designed to simplify HR operations while
                ensuring compliance, security, and efficiency across all
                departments.
              </p>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <div className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-green-500" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:pl-8">
              <Card>
                <CardHeader>
                  <CardTitle>Ready to Transform Your HR Operations?</CardTitle>
                  <CardDescription>
                    Join hundreds of companies who have streamlined their HR
                    processes with our platform.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-lg bg-blue-50 p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        99%
                      </div>
                      <div className="text-sm text-gray-600">
                        Reduction in manual HR tasks
                      </div>
                    </div>
                    <div className="rounded-lg bg-green-50 p-4">
                      <div className="text-2xl font-bold text-green-600">
                        100%
                      </div>
                      <div className="text-sm text-gray-600">
                        Compliance with labor regulations
                      </div>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        24/7
                      </div>
                      <div className="text-sm text-gray-600">
                        Employee self-service access
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Card className="mx-auto max-w-4xl bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
                <div>
                  <h3 className="mb-2 text-2xl font-bold">
                    Start Your HR Transformation Today
                  </h3>
                  <p className="text-blue-100">
                    Get started with our free trial. No credit card required.
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="bg-white text-blue-600 hover:bg-blue-50"
                    asChild
                  >
                    <Link href="/register">Try Free for 30 Days</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10"
                    asChild
                  >
                    <Link href="/login">Schedule a Demo</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
